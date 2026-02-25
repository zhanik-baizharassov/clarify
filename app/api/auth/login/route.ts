import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const input = Schema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return NextResponse.json({ error: "Неверные данные" }, { status: 401 });

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Неверные данные" }, { status: 401 });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}