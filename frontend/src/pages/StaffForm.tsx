import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { staffApi } from "@/services/api";
import { Button, Card, ConfirmDialog, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function StaffForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [isActive, setIsActive] = useState(true);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      staffApi
        .get(id)
        .then((s) => setIsActive(s.is_active))
        .catch((err) => toast(apiError(err, "Failed to load staff."), "error"))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = (form.name || String(fd.get("name") ?? "")).trim();
    const email = (form.email || String(fd.get("email") ?? "")).trim();
    const username = (form.username || String(fd.get("username") ?? "")).trim();
    const password = form.password || String(fd.get("password") ?? "");
    const phone = (form.phone || String(fd.get("phone") ?? "")).trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email";
    if (!username || username.length < 3) errs.username = "Username must be at least 3 characters";
    if (!password || password.length < 8) errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const created = await staffApi.create({ name, email, username, password, phone: phone || undefined });
      toast(`Staff created: ${created.staff_id}`, "success");
      navigate("/staff");
    } catch (err) {
      toast(apiError(err, "Could not create staff."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!id) return;
    setBusy(true);
    try {
      await staffApi.setStatus(id, !isActive);
      toast(!isActive ? "Staff enabled." : "Staff disabled.", "success");
      setConfirmStatus(false);
      navigate("/staff");
    } catch (err) {
      toast(apiError(err, "Could not change status."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    if (!id || newPassword.length < 8) {
      toast("New password must be at least 8 characters.", "error");
      return;
    }
    setBusy(true);
    try {
      await staffApi.resetPassword(id, newPassword);
      toast("Password reset.", "success");
      setResetOpen(false);
      setNewPassword("");
    } catch (err) {
      toast(apiError(err, "Could not reset password."), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title={isEdit ? `Manage staff ${id}` : "Add staff"} subtitle={isEdit ? undefined : "Staff ID is generated automatically"} />
      {!isEdit ? (
        <Card className="max-w-2xl">
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name *</label>
              <Input name="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <Input name="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Username *</label>
              <Input name="username" value={form.username} onChange={(e) => update("username", e.target.value)} />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
            </div>
            <div>
              <label className="label">Password * (min 8 chars)</label>
              <Input name="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Phone</label>
              <Input name="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create staff"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/staff")}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="max-w-2xl space-y-4">
          <p className="text-sm text-slate-600">
            Edit names/emails from the staff list API directly if needed. Here you can enable/disable the
            account or reset the password.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant={isActive ? "danger" : "success"} onClick={() => setConfirmStatus(true)}>
              {isActive ? "Disable account" : "Enable account"}
            </Button>
            <Button variant="secondary" onClick={() => setResetOpen(true)}>
              Reset password
            </Button>
            <Button variant="ghost" onClick={() => navigate("/staff")}>
              Back to list
            </Button>
          </div>
        </Card>
      )}
      <ConfirmDialog
        open={confirmStatus}
        title={isActive ? "Disable this staff account?" : "Enable this staff account?"}
        message="Disabled accounts cannot log in. History is kept."
        confirmLabel={isActive ? "Disable" : "Enable"}
        busy={busy}
        onConfirm={toggleStatus}
        onClose={() => setConfirmStatus(false)}
      />
      <Modal open={resetOpen} title={`Reset password for ${id}`} onClose={() => setResetOpen(false)}>
        <label className="label">New password (min 8 chars)</label>
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button onClick={doReset} disabled={busy}>
            {busy ? "Saving…" : "Reset password"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
