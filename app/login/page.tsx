"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const input = email.trim();
      // A plain username (no "@") maps to the shop's email domain so staff can
      // sign in with just their name, e.g. "priya" -> "priya@snapsell.app".
      // A full email is passed through unchanged.
      const mapped = input.includes("@")
        ? input
        : `${input.toLowerCase()}@snapsell.app`;
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: mapped,
        password,
      });
      if (error) throw error;
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">Seller sign in</h1>
      <p className="mt-2 text-neutral-600">
        Only the shop owner signs in. Shoppers browse freely.
      </p>

      {!configured ? (
        <div className="mt-6 card p-4 text-sm text-neutral-700">
          Supabase is not connected yet. Add your Supabase keys to
          <code className="mx-1 rounded bg-neutral-100 px-1">.env.local</code>
          and restart, then sign in here.
        </div>
      ) : (
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              required
              autoCapitalize="none"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      )}

      <Link href="/" className="mt-8 text-center text-sm text-brand underline">
        Back to shop
      </Link>
    </div>
  );
}
