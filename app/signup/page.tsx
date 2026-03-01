// app/signup/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import { keepKzPhoneInput } from "@/lib/kz";

type SignupPayload = {
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string;
  email: string;
  password: string;
};

const OTP_LEN = 6;

export default function SignupPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  // form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("+7");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // flow
  const [step, setStep] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [lastPayload, setLastPayload] = useState<SignupPayload | null>(null);

  // ui states
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // otp
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [cooldownSec, setCooldownSec] = useState(0);

  const otpValue = otp.join("");

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
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

  async function submitSignup(payload: SignupPayload) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Ошибка регистрации");

      if (data?.needsEmailVerification) {
        setLastPayload(payload);
        setPendingEmail(String(data?.email ?? payload.email));
        setStep("verify");
        setCooldownSec(60);
        resetOtp();
        return;
      }

      // fallback (если вдруг ты оставишь автологин в signup)
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
    setErr(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const nn = nickname.trim();
    const ph = phone.trim();
    const em = email.trim();

    if (fn.length < 2) return setErr("Имя: минимум 2 символа");
    if (ln.length < 2) return setErr("Фамилия: минимум 2 символа");
    if (nn.length < 2) return setErr("Никнейм: минимум 2 символа");
    if (!/^[a-zA-Z0-9_.-]+$/.test(nn)) return setErr("Ник: только латиница/цифры/._-");
    if (!em) return setErr("Введите email");

    if (password.length < 8) return setErr("Пароль: минимум 8 символов");
    if (!/[A-Z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 заглавная буква");
    if (!/[a-z]/.test(password)) return setErr("Пароль: нужна хотя бы 1 строчная буква");
    if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");

    const payload: SignupPayload = {
      firstName: fn,
      lastName: ln,
      nickname: nn,
      phone: ph,
      email: em,
      password,
    };

    await submitSignup(payload);
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
    if (!lastPayload) {
      // без угадываний: в твоей реализации resend работает через повторный signup с теми же данными
      setStep("form");
      setPendingEmail("");
      return setErr("Заполните форму ещё раз, чтобы отправить код повторно.");
    }

    await submitSignup(lastPayload);
  }

  function onOtpChange(i: number, raw: string) {
    const v = (raw ?? "").replace(/\D/g, "").slice(0, 1);
    setOtp((prev) => {
      const copy = [...prev];
      copy[i] = v;
      return copy;
    });

    if (v && i < OTP_LEN - 1) focusOtp(i + 1);

    // если последний символ введён — можно авто-проверку
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

  const formDisabled = step === "verify";

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы оставлять отзывы и видеть профиль."
      bottomHint={
        <div className="flex items-center justify-between gap-3">
          <div>
            Уже есть аккаунт?{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              Войти
            </Link>
          </div>
          <Link className="hover:underline" href="/business">
            Для бизнеса →
          </Link>
        </div>
      }
    >
      <div className="grid gap-4">
        {/* FORM */}
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field label="Имя">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="Например: Жанибек"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Фамилия">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="Например: Байжарассов"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Никнейм" hint="Только латиница/цифры/._- (пример: zhanik02)">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="zhanik02"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="username"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Телефон" hint="Формат: +7XXXXXXXXXX (только KZ оператор)">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="+77011234567"
              value={phone}
              onChange={(e) => setPhone(keepKzPhoneInput(e.target.value))}
              autoComplete="tel"
              inputMode="tel"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Email">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Пароль" hint="Мин 8 символов, A-z и 0-9">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading || formDisabled}
            />
          </Field>

          <button
            disabled={loading || formDisabled}
            className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Отправляем код..." : "Создать аккаунт"}
          </button>

          {formDisabled ? (
            <div className="text-xs text-muted-foreground">
              Данные зафиксированы — подтвердите email кодом ниже.
            </div>
          ) : null}
        </form>

        {/* VERIFY */}
        {step === "verify" ? (
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
                disabled={verifyLoading || cooldownSec > 0}
                className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                {cooldownSec > 0 ? `Отправить снова через ${cooldownSec}с` : "Отправить код ещё раз"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setPendingEmail("");
                  setOtp(Array(OTP_LEN).fill(""));
                  setErr(null);
                }}
                disabled={verifyLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl border bg-background px-5 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                Изменить email
              </button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Можно вставить код целиком (Ctrl+V) в первое поле.
            </div>
          </div>
        ) : null}

        {/* ERROR */}
        {err ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}