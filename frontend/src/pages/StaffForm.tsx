import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffApi } from "@/services/api";
import { Button, Card, ConfirmDialog, FieldError, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (id) {
      staffApi
        .get(id)
        .then((s) => {
          reset({ name: s.name, email: s.email, username: "", password: "********", phone: s.phone ?? "" });
          setIsActive(s.is_active);
        })
        .catch((err) => toast(apiError(err, "Failed to load staff."), "error"))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onCreate(values: CreateValues) {
    setBusy(true);
    try {
      const created = await staffApi.create(values as Record<string, unknown>);
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
          <form onSubmit={handleSubmit(onCreate)} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name *</label>
              <Input {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <label className="label">Email *</label>
              <Input {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label className="label">Username *</label>
              <Input {...register("username")} />
              <FieldError message={errors.username?.message} />
            </div>
            <div>
              <label className="label">Password * (min 8 chars)</label>
              <Input type="password" {...register("password")} />
              <FieldError message={errors.password?.message} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Phone</label>
              <Input {...register("phone")} />
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
