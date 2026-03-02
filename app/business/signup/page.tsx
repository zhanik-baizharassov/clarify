import { Suspense } from "react";
import BusinessSignupClient from "./BusinessSignupClient";

export default function BusinessSignupPage() {
  return (
    <Suspense fallback={<div className="p-4">Загрузка...</div>}>
      <BusinessSignupClient />
    </Suspense>
  );
}