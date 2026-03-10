import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-4">Загрузка...</div>}>
      <SignupClient />
    </Suspense>
  );
}