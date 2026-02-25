import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  ownerName: z.string().min(2).max(80),
  companyName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const input = Schema.parse(await req.json());

  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) return NextResponse.json({ error: "Email уже занят" }, { status: 409 });

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: { name: input.ownerName, email: input.email, passwordHash, role: "COMPANY" },
  });

  await prisma.company.create({
    data: { name: input.companyName, ownerId: user.id },
  });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

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