"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  authErrorMessage,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { getDb } from "@/lib/firebase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "email" | "reset" | null>(null);

  function finish() {
    router.replace(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");
    try {
      await signInWithGoogle();
      finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending("email");
    try {
      if (mode === "signup") {
        const credential = await signUpWithEmail(email, password, name || undefined);
        await setDoc(
          doc(getDb(), "users", credential.user.uid),
          {
            displayName: name || null,
            email,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await signInWithEmail(email, password);
      }
      finish();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  async function handleReset() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setPending("reset");
    try {
      await sendPasswordReset(email);
      setNotice("Password reset email sent.");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" onClick={handleGoogle} disabled={pending !== null} className="h-10">
        {pending === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" ? (
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            autoComplete="name"
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : null}
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

        <Button type="submit" className="h-10" disabled={pending !== null}>
          {pending === "email" ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        {mode === "signin" ? (
          <button
            type="button"
            onClick={handleReset}
            disabled={pending !== null}
            className="text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </button>
        ) : null}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.96h5.28c-.23 1.36-1.62 3.98-5.28 3.98-3.18 0-5.77-2.63-5.77-5.87s2.59-5.87 5.77-5.87c1.81 0 3.02.77 3.72 1.43l2.53-2.44C16.77 3.71 14.71 2.8 12.18 2.8 6.98 2.8 2.77 7 2.77 12.17s4.21 9.37 9.41 9.37c5.43 0 9.03-3.82 9.03-9.2 0-.62-.07-1.09-.15-1.24Z"
      />
    </svg>
  );
}
