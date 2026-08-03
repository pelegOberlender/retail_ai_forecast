"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // If Supabase has email confirmation enabled, there's no session yet.
    if (!data.session) {
      setCheckEmail(true);
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      title="Create an account"
      description="Set up your workspace for seasonal planning, historic performance, and buy recommendations."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="focus-ring font-medium text-accent-dark underline underline-offset-4">
            Log in
          </Link>
        </p>
      }
    >
        {checkEmail ? (
          <p className="text-center text-sm text-foreground-soft">
            Almost there. Check <span className="text-foreground">{email}</span> for a confirmation link, then{" "}
            <Link href="/login" className="text-accent-dark underline">
              log in
            </Link>
            .
          </p>
        ) : (
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-control text-sm"
              />
              <p className="mt-1.5 text-xs text-foreground-soft">At least 8 characters.</p>
            </Field>

            {error && <p className="text-sm text-tone-red">{error}</p>}

            <Button type="submit" variant="dark" className="mt-2 w-full cursor-pointer justify-center" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}
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
