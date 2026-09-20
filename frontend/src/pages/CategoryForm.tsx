import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoriesApi } from "@/services/api";
import { Button, Card, FieldError, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CategoryForm() {
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
      await categoriesApi.create(values);
      toast("Category created.", "success");
      navigate("/categories");
    } catch (err) {
      toast(apiError(err, "Could not create the category."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add category" />
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <Input placeholder="e.g. Programming" {...register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <label className="label">Description</label>
            <Input {...register("description")} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create category"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/categories")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
