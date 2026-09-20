import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { booksApi, categoriesApi } from "@/services/api";
import type { Category } from "@/types";
import { Button, Card, ConfirmDialog, FieldError, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().min(5, "ISBN must be at least 5 characters"),
  category_id: z.coerce.number().int().positive("Category is required"),
  publisher: z.string().optional(),
  publication_year: z.coerce.number().int().min(1000).max(9999).optional().or(z.literal("")),
  total_copies: z.coerce.number().int().min(0, "Total copies must be ≥ 0"),
  shelf_location: z.string().optional(),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategories)
      .catch((err) => toast(apiError(err, "Failed to load categories."), "error"));
    if (id) {
      booksApi
        .get(id)
        .then((b) =>
          reset({
            title: b.title,
            author: b.author,
            isbn: b.isbn,
            category_id: b.category_id,
            publisher: b.publisher ?? "",
            publication_year: (b.publication_year ?? "") as never,
            total_copies: b.total_copies,
            shelf_location: b.shelf_location ?? "",
            is_active: b.is_active,
          }),
        )
        .catch((err) => toast(apiError(err, "Failed to load book."), "error"))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      const payload = {
        ...values,
        publisher: values.publisher || undefined,
        shelf_location: values.shelf_location || undefined,
        publication_year: values.publication_year === "" ? undefined : values.publication_year,
      };
      if (isEdit && id) {
        await booksApi.update(id, payload as Record<string, unknown>);
        toast("Book updated.", "success");
      } else {
        await booksApi.create(payload as Record<string, unknown>);
        toast("Book created.", "success");
      }
      navigate("/books");
    } catch (err) {
      toast(apiError(err, "Could not save the book."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    try {
      await booksApi.remove(id);
      toast("Book disabled.", "success");
      navigate("/books");
    } catch (err) {
      toast(apiError(err, "Could not delete the book."), "error");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title={isEdit ? `Edit book ${id}` : "Add book"} />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Title *</label>
            <Input {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <label className="label">Author *</label>
            <Input {...register("author")} />
            <FieldError message={errors.author?.message} />
          </div>
          <div>
            <label className="label">ISBN * (10 or 13 digits)</label>
            <Input {...register("isbn")} />
            <FieldError message={errors.isbn?.message} />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" {...register("category_id")}>
              <option value="">Select…</option>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <FieldError message={errors.category_id?.message} />
          </div>
          <div>
            <label className="label">Publisher</label>
            <Input {...register("publisher")} />
          </div>
          <div>
            <label className="label">Publication year</label>
            <Input type="number" {...register("publication_year")} />
            <FieldError message={errors.publication_year?.message} />
          </div>
          <div>
            <label className="label">Total copies *</label>
            <Input type="number" min={0} {...register("total_copies")} />
            <FieldError message={errors.total_copies?.message} />
          </div>
          <div>
            <label className="label">Shelf / location</label>
            <Input {...register("shelf_location")} />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register("is_active")} checked={watch("is_active")} />
              <label htmlFor="is_active" className="text-sm text-slate-700">
                Active (uncheck to disable)
              </label>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create book"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/books")}>
              Cancel
            </Button>
            {isEdit && (
              <Button type="button" variant="danger" className="ml-auto" onClick={() => setConfirmDelete(true)}>
                Disable book
              </Button>
            )}
          </div>
        </form>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="Disable this book?"
        message="The book will be hidden from issuing but history is kept."
        confirmLabel="Disable"
        busy={busy}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
