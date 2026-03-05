// app/business/signup/page.tsx
import { Suspense } from "react";
import BusinessSignupClient from "./BusinessSignupClient";

export const dynamic = "force-dynamic";

function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-3xl border bg-background/80 p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded bg-muted/50" />
        <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-muted/50" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-muted/50" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

export default function BusinessSignupPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BusinessSignupClient />
    </Suspense>
  );
}