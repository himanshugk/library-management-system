import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Button, Card, FieldError, Input } from "@/components/ui";
import { apiError } from "@/lib/utils";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      await login(values.username, values.password);
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">Username</label>
            <Input id="username" autoComplete="username" placeholder="admin" {...register("username")} />
            <FieldError message={errors.username?.message} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
            <FieldError message={errors.password?.message} />
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
