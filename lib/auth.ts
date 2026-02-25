import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get("session")?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  // если сессия просрочена — удалим и считаем что не залогинен
  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  return session.user; // { id, email, role, ... }
}