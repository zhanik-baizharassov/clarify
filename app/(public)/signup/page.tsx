import type { Metadata } from "next";
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт Clarify, чтобы оставлять отзывы, оценивать компании и пользоваться профилем на платформе.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-4">Загрузка...</div>}>
      <SignupClient />
    </Suspense>
  );
}