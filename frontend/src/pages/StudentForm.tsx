import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentsApi } from "@/services/api";
import { Button, Card, FieldError, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  department: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function StudentForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      const payload = { ...values, email: values.email || undefined };
      const created = await studentsApi.create(payload as Record<string, unknown>);
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
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name *</label>
            <Input {...register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <label className="label">Phone *</label>
            <Input {...register("phone")} />
            <FieldError message={errors.phone?.message} />
          </div>
          <div>
            <label className="label">Email</label>
            <Input {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label className="label">Department / class</label>
            <Input {...register("department")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <Input {...register("address")} />
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
