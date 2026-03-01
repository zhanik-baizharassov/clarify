import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT ?? 465);
const secure = String(process.env.SMTP_SECURE ?? "true") === "true";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

const from = process.env.MAIL_FROM ?? user ?? "";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Mail: env ${name} is required`);
  return v;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: must(user, "SMTP_USER"),
      pass: must(pass, "SMTP_PASS"),
    },
  });
  return transporter;
}

export async function sendEmailVerificationCode(to: string, code: string) {
  const t = getTransporter();

  // Gmail часто подставляет From как SMTP_USER — это нормально. :contentReference[oaicite:3]{index=3}
  await t.sendMail({
    from,
    to,
    subject: "Код подтверждения Clarify",
    text: `Ваш код подтверждения: ${code}\nКод действует 10 минут.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">Подтверждение email</h2>
        <p>Ваш код:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:10px 0 18px">
          ${code}
        </div>
        <p style="color:#555">Код действует 10 минут. Если это были не вы — просто игнорируйте письмо.</p>
      </div>
    `,
  });
}