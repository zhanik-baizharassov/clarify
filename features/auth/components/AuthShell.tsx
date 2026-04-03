import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

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
    <section className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-10 h-40 w-40 rounded-full bg-warm-accent/60 blur-3xl"
      />

      <div className="mx-auto flex max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="clarify-card-elevated relative mx-auto w-full max-w-xl overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
          />

          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="clarify-badge-premium w-fit">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Защищённый доступ
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>

                {subtitle ? (
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {subtitle}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Clarify — отзывы и репутация по Казахстану.
                  </p>
                )}
              </div>

              <Link href="/" className="clarify-button-secondary-sm shrink-0">
                На главную
              </Link>
            </div>

            <div className="mt-6">{children}</div>

            {bottomHint ? (
              <div className="mt-6 rounded-[20px] border border-border bg-surface-soft/80 p-4 text-sm text-muted-foreground">
                {bottomHint}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}