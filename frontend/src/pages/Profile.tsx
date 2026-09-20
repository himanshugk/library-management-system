import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/api";
import { Badge, Button, Card, FieldError, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

const schema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm the new password"),
  })
  .refine((v) => v.new_password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      await authApi.changePassword(values.old_password, values.new_password);
      toast("Password changed.", "success");
      reset();
    } catch (err) {
      toast(apiError(err, "Could not change password."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Profile" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold">Account</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Staff ID</dt><dd className="font-mono">{user?.staff_id}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd>{user?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Username</dt><dd>{user?.username}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd><Badge tone={user?.role === "ADMIN" ? "amber" : "blue"}>{user?.role}</Badge></dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Change password</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-3">
            <div>
              <label className="label">Current password</label>
              <Input type="password" {...register("old_password")} />
              <FieldError message={errors.old_password?.message} />
            </div>
            <div>
              <label className="label">New password</label>
              <Input type="password" {...register("new_password")} />
              <FieldError message={errors.new_password?.message} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <Input type="password" {...register("confirm")} />
              <FieldError message={errors.confirm?.message} />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
