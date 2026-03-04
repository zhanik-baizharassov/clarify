// server/email/mailer.ts
import nodemailer from "nodemailer";

type SendResult = { ok: true; messageId?: string };

const DEFAULT_HOST = "smtp.gmail.com";
const DEFAULT_PORT = 465;

function boolFromEnv(v: string | undefined, fallback: boolean) {
  if (v == null) return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function numFromEnv(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function assertMailEnv() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user) throw new Error("Mail: env SMTP_USER is missing");
  if (!pass) throw new Error("Mail: env SMTP_PASS is missing");
  return { user, pass };
}

function getFromAddress() {
  const appName = process.env.APP_NAME?.trim() || "Clarify";
  const from = process.env.MAIL_FROM?.trim();
  const fallback = `"${appName}" <${process.env.SMTP_USER}>`;
  return from || fallback;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const { user, pass } = assertMailEnv();

  const host = (process.env.SMTP_HOST?.trim() || DEFAULT_HOST).toString();
  const port = numFromEnv(process.env.SMTP_PORT, DEFAULT_PORT);
  // если порт 465 — почти всегда secure=true
  const secure = boolFromEnv(process.env.SMTP_SECURE, port === 465);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmailVerificationCode(
  to: string,
  code: string,
  opts?: { ttlMinutes?: number },
): Promise<SendResult> {
  const appName = process.env.APP_NAME?.trim() || "Clarify";
  const ttlMinutes = opts?.ttlMinutes ?? 10;

  // ✅ защита от header injection и мусора
  const safeTo = String(to).trim().replace(/[\r\n]/g, "");

  // ✅ код только цифры
  const safeCode = String(code).replace(/\D/g, "").slice(0, 6);
  if (safeCode.length !== 6) {
    throw new Error("Mail: invalid verification code");
  }

  const subject = `Подтверждение email для ${appName}`;

  const text =
    `Подтверждение email\n\n` +
    `Ваш код: ${safeCode}\n\n` +
    `Код действует ${ttlMinutes} минут.\n` +
    `Если вы не запрашивали регистрацию — просто проигнорируйте это письмо.\n\n` +
    `— ${appName}`;

  const preheader = `Ваш код для подтверждения email в ${appName} (действует ${ttlMinutes} минут).`;

  const html = `
  <div style="background:#f6f7fb;padding:24px;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#111;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>

    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e9ee;border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;border-bottom:1px solid #eef0f4;background:#ffffff;">
        <div style="font-size:14px;letter-spacing:0.2px;color:#6b7280;">${appName}</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px;">Подтверждение email</div>
      </div>

      <div style="padding:20px;">
        <div style="font-size:14px;line-height:1.6;color:#374151;">
          Вы создаёте аккаунт в <b>${appName}</b>. Введите код ниже, чтобы подтвердить адрес электронной почты.
        </div>

        <div style="margin:18px 0;padding:16px;border:1px dashed #d6dae3;border-radius:14px;background:#fbfbfd;text-align:center;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Код подтверждения</div>
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;line-height:1;color:#111;">
            ${safeCode}
          </div>
        </div>

        <div style="font-size:13px;line-height:1.6;color:#4b5563;">
          <b>Срок действия:</b> ${ttlMinutes} минут.<br/>
          Если вы не запрашивали это действие — просто проигнорируйте письмо.
        </div>

        <div style="margin-top:16px;padding:12px;border-radius:12px;background:#f3f4f6;color:#6b7280;font-size:12px;line-height:1.5;">
          Никому не сообщайте код. Сотрудники ${appName} никогда не запрашивают коды по телефону или в чате.
        </div>
      </div>

      <div style="padding:14px 20px;border-top:1px solid #eef0f4;background:#ffffff;color:#9ca3af;font-size:12px;">
        © ${new Date().getFullYear()} ${appName}
      </div>
    </div>
  </div>
  `;

  const t = getTransporter();
  const info = await t.sendMail({
    from: getFromAddress(),
    to: safeTo,
    subject,
    text,
    html,
  });

  return { ok: true, messageId: info?.messageId };
}