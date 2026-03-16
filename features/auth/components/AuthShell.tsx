"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  children,
  bottomHint,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  bottomHint?: ReactNode;
}) {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-muted/50 via-background to-background">
      <div className="mx-auto flex max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-xl rounded-3xl border bg-background/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <Link
              href="/"
              className="text-sm text-muted-foreground hover:underline"
            >
              На главную
            </Link>
          </div>

          <div className="mt-6">{children}</div>

          {bottomHint ? (
            <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">
              {bottomHint}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}