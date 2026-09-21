import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/api";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const old_password = form.old_password || String(fd.get("old_password") ?? "");
    const new_password = form.new_password || String(fd.get("new_password") ?? "");
    const confirm = form.confirm || String(fd.get("confirm") ?? "");

    const errs: Record<string, string> = {};
    if (!old_password) errs.old_password = "Current password is required";
    if (!new_password || new_password.length < 8) errs.new_password = "New password must be at least 8 characters";
    if (!confirm) errs.confirm = "Please confirm the new password";
    else if (new_password !== confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      await authApi.changePassword(old_password, new_password);
      toast("Password changed.", "success");
      setForm({ old_password: "", new_password: "", confirm: "" });
      setErrors({});
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
          <form onSubmit={onSubmit} className="mt-2 space-y-3">
            <div>
              <label className="label">Current password</label>
              <Input
                name="old_password"
                type="password"
                value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })}
              />
              {errors.old_password && <p className="mt-1 text-xs text-red-600">{errors.old_password}</p>}
            </div>
            <div>
              <label className="label">New password</label>
              <Input
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              />
              {errors.new_password && <p className="mt-1 text-xs text-red-600">{errors.new_password}</p>}
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <Input
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
              {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>}
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
