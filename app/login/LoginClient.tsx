"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/features/auth/components/AuthShell";

const OTP_LEN = 6;

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [step, setStep] = useState<"login" | "verify">("login");

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // verify
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpValue = otp.join("");

  // resend cooldown
  const [cooldownSec, setCooldownSec] = useState(0);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // таймер cooldown
  useEffect(() => {
    if (cooldownSec <= 0) return;

    const t = setInterval(() => {
      setCooldownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [cooldownSec]);

  function focusOtp(i: number) {
    otpRefs.current[i]?.focus();
    otpRefs.current[i]?.select?.();
  }

  function resetOtp() {
    setOtp(Array(OTP_LEN).fill(""));
    setTimeout(() => focusOtp(0), 0);
  }

  async function doLogin(sendToVerifyUI = true) {
    const em = email.trim();

    if (!em) {
      setErr("Введите email");
      return;
    }
    if (!password) {
      setErr("Введите пароль");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password }),
      });

      const data = await res.json().catch(() => ({}));

      // ✅ если нужен verify — показываем OTP
      if (res.status === 403) {
        if (sendToVerifyUI) {
          setPendingEmail(em);
          setStep("verify");
          resetOtp();
        }

        // анти-спам UX
        setCooldownSec(60);

        setErr(data?.error ?? "Подтвердите email: введите код из письма");
        return;
      }

      if (!res.ok) throw new Error(data?.error ?? "Не удалось войти");

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(true);
  }

  async function verifyCode() {
    setErr(null);

    if (!pendingEmail) return setErr("Email для подтверждения не найден");
    if (!/^\d{6}$/.test(otpValue)) return setErr("Введите 6-значный код");

    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: otpValue }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось подтвердить email");

      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
      resetOtp();
    } finally {
      setVerifyLoading(false);
    }
  }

  async function resendCode() {
    setErr(null);
    if (cooldownSec > 0) return;

    // ✅ повторяем логин, чтобы backend отправил код ещё раз (если так реализовано)
    await doLogin(false);
  }

  function onOtpChange(i: number, raw: string) {
    const v = (raw ?? "").replace(/\D/g, "").slice(0, 1);

    setOtp((prev) => {
      const copy = [...prev];
      copy[i] = v;
      return copy;
    });

    if (v && i < OTP_LEN - 1) focusOtp(i + 1);

    if (v && i === OTP_LEN - 1) {
      setTimeout(() => {
        const full = [...otp.slice(0, i), v].join("");
        if (/^\d{6}$/.test(full)) verifyCode();
      }, 0);
    }
  }

  function onOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (otp[i]) {
        setOtp((prev) => {
          const copy = [...prev];
          copy[i] = "";
          return copy;
        });
        return;
      }

      if (i > 0) {
        focusOtp(i - 1);
        setOtp((prev) => {
          const copy = [...prev];
          copy[i - 1] = "";
          return copy;
        });
      }
    }

    if (e.key === "ArrowLeft" && i > 0) focusOtp(i - 1);
    if (e.key === "ArrowRight" && i < OTP_LEN - 1) focusOtp(i + 1);
  }

  function onOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text") ?? "";
    const digits = text.replace(/\D/g, "").slice(0, OTP_LEN);
    if (!digits) return;

    e.preventDefault();

    const arr = digits.split("");

    setOtp((prev) => {
      const copy = [...prev];
      for (let i = 0; i < OTP_LEN; i++) copy[i] = arr[i] ?? "";
      return copy;
    });

    const nextIndex = Math.min(arr.length, OTP_LEN - 1);
    setTimeout(() => focusOtp(nextIndex), 0);

    if (digits.length === OTP_LEN) {
      setTimeout(() => verifyCode(), 0);
    }
  }

  return (
    <AuthShell
      title="Войти"
      subtitle="Доступ к профилю, отзывам и кабинету компании."
      bottomHint={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            Нет аккаунта?{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/signup?next=${encodeURIComponent(next)}`}
            >
              Регистрация
            </Link>
          </div>

          <Link className="hover:underline" href="/business/signup">
            Регистрация компании →
          </Link>
        </div>
      }
    >
      {step === "login" ? (
        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Пароль</span>
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {err ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl border bg-background p-5">
            <div className="text-sm font-semibold">Подтвердите email</div>

            <div className="mt-1 text-sm text-muted-foreground">
              Мы отправили 6-значный код на{" "}
              <span className="font-medium text-foreground">{pendingEmail}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: OTP_LEN }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  className="h-12 w-12 rounded-xl border bg-background text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  type="password"
                  value={otp[i]}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(i, e)}
                  onPaste={i === 0 ? onOtpPaste : undefined}
                  disabled={verifyLoading}
                  aria-label={`Цифра ${i + 1}`}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={verifyCode}
                disabled={verifyLoading || !/^\d{6}$/.test(otpValue)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                {verifyLoading ? "Проверяем..." : "Подтвердить"}
              </button>

              <button
                type="button"
                onClick={resendCode}
                disabled={verifyLoading || loading || cooldownSec > 0}
                className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                {cooldownSec > 0
                  ? `Отправить снова через ${cooldownSec}с`
                  : "Отправить код ещё раз"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setPendingEmail("");
                  resetOtp();
                  setErr(null);
                }}
                disabled={verifyLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                Назад к логину
              </button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Можно вставить код целиком (Ctrl+V) в первое поле.
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}
        </div>
      )}
    </AuthShell>
  );
}