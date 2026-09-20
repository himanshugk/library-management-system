import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Button, Card, FieldError, Input } from "@/components/ui";
import { apiError } from "@/lib/utils";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  // Controlled inputs (plain state) so browser autofill can never
  // leave the form thinking a visibly-filled field is empty.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Read straight from the DOM as well, in case a password manager
    // filled the fields without firing React change events.
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const u = username || String(data.get("username") ?? "").trim();
    const p = password || String(data.get("password") ?? "");

    setUsernameError(u ? "" : "Username is required");
    setPasswordError(p ? "" : "Password is required");
    if (!u || !p) return;

    setBusy(true);
    try {
      await login(u, p);
      const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      toast(apiError(err, "Login failed."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-2xl text-white">
            📚
          </div>
          <h1 className="text-xl font-bold text-slate-900">Library Management System</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your staff account</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">Username</label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError("");
              }}
            />
            <FieldError message={usernameError} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
            />
            <FieldError message={passwordError} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Demo accounts: <b>admin / Admin@123</b> (admin), <b>staff / Staff@123</b> (staff).
        </p>
      </Card>
    </div>
  );
}
