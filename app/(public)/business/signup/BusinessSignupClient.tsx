"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import AuthShell from "@/features/auth/components/AuthShell";
import KzAddressSuggestInput from "@/components/forms/KzAddressSuggestInput";
import {
  KZ_CITIES,
  keepKzPhoneInput,
  normalizeKzPhone,
} from "@/shared/kz/kz";

type CompanySignupPayload = {
  companyName: string;
  bin: string;
  city: string;
  phone: string;
  email: string;
  address: string;
  password: string;
};

const OTP_LEN = 6;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function BusinessSignupPage() {
  const router = useRouter();
  const search = useSearchParams();

  const nextRaw = search.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/company";

  const [companyName, setCompanyName] = useState("");
  const [bin, setBin] = useState("");
  const [city, setCity] = useState<string>(KZ_CITIES[0] ?? "Алматы");
  const [phone, setPhone] = useState("+7");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<"form" | "verify">("form");
  const [pendingEmail, setPendingEmail] = useState<string>("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [cooldownSec, setCooldownSec] = useState(0);

  const otpValue = otp.join("");
  const formDisabled = step === "verify";

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(
      () => setCooldownSec((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
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

  function resetVerifyStep(message?: string) {
    setStep("form");
    setPendingEmail("");
    setCooldownSec(0);
    setOtp(Array(OTP_LEN).fill(""));
    setErr(message ?? null);
  }

  async function submitCompanySignup(payload: CompanySignupPayload) {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/auth/company-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Ошибка регистрации компании");

      if (data?.needsEmailVerification) {
        setPendingEmail(normalizeEmail(String(data?.email ?? payload.email)));
        setStep("verify");
        setCooldownSec(
          typeof data?.cooldownSec === "number" ? data.cooldownSec : 60,
        );
        resetOtp();
        setErr(typeof data?.notice === "string" ? data.notice : null);
        return;
      }

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

    const cn = companyName.trim();
    const b = bin.trim();
    const ph = phone.trim();
    const em = normalizeEmail(email);
    const addr = address.trim();

    if (cn.length < 2) return setErr("Название компании: минимум 2 символа");
    if (!/^\d{12}$/.test(b)) return setErr("БИН должен состоять из 12 цифр");
    if (!city) return setErr("Город: выберите город из списка");
    if (!em) return setErr("Введите email");
    if (addr.length < 5) return setErr("Адрес: минимум 5 символов");

    if (!/\d/.test(addr)) {
      return setErr("Адрес: укажите номер дома (например «Самал-2, дом 111»)");
    }

    let phoneNorm = "";
    try {
      phoneNorm = normalizeKzPhone(ph, "Телефон");
    } catch (e: any) {
      return setErr(e?.message ?? "Телефон: некорректный формат");
    }

    if (password.length < 8) return setErr("Пароль: минимум 8 символов");
    if (!/[A-Z]/.test(password)) {
      return setErr("Пароль: нужна хотя бы 1 заглавная буква");
    }
    if (!/[a-z]/.test(password)) {
      return setErr("Пароль: нужна хотя бы 1 строчная буква");
    }
    if (!/\d/.test(password)) return setErr("Пароль: нужна хотя бы 1 цифра");

    const payload: CompanySignupPayload = {
      companyName: cn,
      bin: b,
      city,
      phone: phoneNorm,
      email: em,
      address: addr,
      password,
    };

    await submitCompanySignup(payload);
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

      if (res.status === 410) {
        resetVerifyStep(
          data?.error ??
            "Срок подтверждения бизнес-регистрации истёк. Заполните форму заново.",
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось подтвердить email");
      }

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
    if (!pendingEmail) return setErr("Email для отправки кода не найден");

    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 410) {
        resetVerifyStep(
          data?.error ??
            "Срок подтверждения аккаунта истёк. Заполните форму заново.",
        );
        return;
      }

      if (!res.ok) throw new Error(data?.error ?? "Не удалось отправить код");

      const nextCooldown =
        typeof data?.cooldownSec === "number" ? data.cooldownSec : 60;

      setCooldownSec(nextCooldown);
      resetOtp();
      setErr("Код отправлен. Проверьте почту.");
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setVerifyLoading(false);
    }
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
      title="Регистрация компании"
      subtitle="Создайте бизнес-аккаунт, чтобы добавлять филиалы и отвечать на отзывы."
      bottomHint={
        <div className="flex items-center justify-between gap-3">
          <div>
            Уже есть бизнес-аккаунт?{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href={`/login?next=${encodeURIComponent(next)}`}
            >
              Войти
            </Link>
          </div>
          <Link className="hover:underline" href="/signup">
            Я пользователь →
          </Link>
        </div>
      }
    >
      <div className="grid gap-4">
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field label="Название компании">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder=""
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="БИН" hint="12 цифр">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder=""
              value={bin}
              onChange={(e) =>
                setBin(e.target.value.replace(/\D/g, "").slice(0, 12))
              }
              inputMode="numeric"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Город">
            <div className="relative">
              <select
                disabled={loading || formDisabled}
                className="h-11 w-full appearance-none rounded-xl border bg-background px-4 pr-12 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {KZ_CITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <span className="pointer-events-none absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
              </span>
            </div>
          </Field>

          <Field label="Телефон" hint="Только KZ: +7XXXXXXXXXX">
            <input
              className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              placeholder="+7"
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
              placeholder="company@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading || formDisabled}
            />
          </Field>

          <Field label="Адрес" hint="Казахстан">
            <KzAddressSuggestInput
              city={city}
              value={address}
              onChange={setAddress}
              disabled={loading || formDisabled}
              placeholder="Начните вводить адрес и выберите из подсказки"
            />
            <span className="text-xs text-muted-foreground">
              Лучше выбрать адрес из подсказок, чтобы регистрация прошла точнее.
            </span>
          </Field>

          <Field label="Пароль" hint="Мин 8 символов, A-z и 0-9">
            <div className="relative">
              <input
                className="h-11 w-full rounded-xl border bg-background px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                placeholder=""
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading || formDisabled}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading || formDisabled}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <button
            disabled={loading || formDisabled}
            className="mt-2 h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Отправляем код..." : "Создать бизнес-аккаунт"}
          </button>

          {formDisabled ? (
            <div className="text-xs text-muted-foreground">
              Регистрация сохранена как неподтверждённая — завершите её кодом из письма.
            </div>
          ) : null}
        </form>

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
                  resetVerifyStep();
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
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}