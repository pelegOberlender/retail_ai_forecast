"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Return to your buying workspace and continue the decisions already in motion."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="focus-ring font-medium text-accent-dark underline underline-offset-4">
            Register
          </Link>
        </p>
      }
    >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-control text-sm"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-control text-sm"
            />
          </Field>

          {error && <p className="text-sm text-tone-red">{error}</p>}

          <Button type="submit" variant="dark" className="mt-2 w-full cursor-pointer justify-center" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="tracking-label mb-1.5 block text-xs text-foreground-soft">{label}</label>
      {children}
    </div>
  );
}
