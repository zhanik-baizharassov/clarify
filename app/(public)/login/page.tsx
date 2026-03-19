import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Вход",
  description:
    "Войдите в аккаунт Clarify, чтобы оставлять отзывы, управлять профилем и пользоваться возможностями платформы.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4">Загрузка...</div>}>
      <LoginClient />
    </Suspense>
  );
}