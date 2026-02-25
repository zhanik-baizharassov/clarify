import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const store = await cookies();
  const token = store.get("session")?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", expires: new Date(0) });
  return res;
}