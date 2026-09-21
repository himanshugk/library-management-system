import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { studentsApi } from "@/services/api";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function StudentForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", phone: "", email: "", department: "", address: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = String(fd.get("name") || form.name).trim();
    const phone = String(fd.get("phone") || form.phone).trim();
    const email = String(fd.get("email") || form.email).trim();
    const department = String(fd.get("department") || form.department).trim();
    const address = String(fd.get("address") || form.address).trim();

    const errs: Record<string, string> = {};
    if (!name) errs.name = "Name is required";
    if (!phone) errs.phone = "Phone is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const payload = {
        name,
        phone,
        email: email || undefined,
        department: department || undefined,
        address: address || undefined,
      };
      const created = await studentsApi.create(payload);
      toast(`Student created: ${created.student_id}`, "success");
      navigate(`/students/${created.student_id}`);
    } catch (err) {
      toast(apiError(err, "Could not create the student."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add student" subtitle="Student ID is generated automatically" />
      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name *</label>
            <Input
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Phone *</label>
            <Input
              name="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <Input
              name="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Department / class</label>
            <Input
              name="department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <Input
              name="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create student"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/students")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
