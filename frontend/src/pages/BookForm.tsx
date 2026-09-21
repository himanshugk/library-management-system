import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { booksApi, categoriesApi } from "@/services/api";
import type { Category } from "@/types";
import { Button, Card, ConfirmDialog, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function BookForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category_id: "",
    publisher: "",
    publication_year: "",
    total_copies: "1",
    shelf_location: "",
    is_active: true,
  });

  useEffect(() => {
    categoriesApi
      .list()
      .then(setCategories)
      .catch((err) => toast(apiError(err, "Failed to load categories."), "error"));
    if (id) {
      booksApi
        .get(id)
        .then((b) =>
          setForm({
            title: b.title,
            author: b.author,
            isbn: b.isbn,
            category_id: String(b.category_id),
            publisher: b.publisher ?? "",
            publication_year: b.publication_year ? String(b.publication_year) : "",
            total_copies: String(b.total_copies),
            shelf_location: b.shelf_location ?? "",
            is_active: b.is_active,
          }),
        )
        .catch((err) => toast(apiError(err, "Failed to load book."), "error"))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const title = form.title || String(fd.get("title") ?? "").trim();
    const author = form.author || String(fd.get("author") ?? "").trim();
    const isbn = form.isbn || String(fd.get("isbn") ?? "").trim();
    const category_id = form.category_id || String(fd.get("category_id") ?? "").trim();
    const publisher = form.publisher || String(fd.get("publisher") ?? "").trim();
    const publication_year = form.publication_year || String(fd.get("publication_year") ?? "").trim();
    const total_copies = form.total_copies || String(fd.get("total_copies") ?? "").trim();
    const shelf_location = form.shelf_location || String(fd.get("shelf_location") ?? "").trim();

    const errs: Record<string, string> = {};
    if (!title) errs.title = "Title is required";
    if (!author) errs.author = "Author is required";
    if (!isbn || isbn.length < 5) errs.isbn = "ISBN must be at least 5 characters";
    if (!category_id) errs.category_id = "Category is required";
    if (total_copies === "" || Number.isNaN(Number(total_copies)) || Number(total_copies) < 0)
      errs.total_copies = "Total copies must be ≥ 0";
    if (publication_year && (Number(publication_year) < 1000 || Number(publication_year) > 9999))
      errs.publication_year = "Invalid year";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        author,
        isbn,
        category_id: Number(category_id),
        publisher: publisher || undefined,
        publication_year: publication_year ? Number(publication_year) : undefined,
        total_copies: Number(total_copies),
        shelf_location: shelf_location || undefined,
        is_active: form.is_active,
      };
      if (isEdit && id) {
        await booksApi.update(id, payload);
        toast("Book updated.", "success");
      } else {
        await booksApi.create(payload);
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
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Title *</label>
            <Input name="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>
          <div>
            <label className="label">Author *</label>
            <Input name="author" value={form.author} onChange={(e) => update("author", e.target.value)} />
            {errors.author && <p className="mt-1 text-xs text-red-600">{errors.author}</p>}
          </div>
          <div>
            <label className="label">ISBN * (10 or 13 digits)</label>
            <Input name="isbn" value={form.isbn} onChange={(e) => update("isbn", e.target.value)} />
            {errors.isbn && <p className="mt-1 text-xs text-red-600">{errors.isbn}</p>}
          </div>
          <div>
            <label className="label">Category *</label>
            <select
              name="category_id"
              className="input"
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
            >
              <option value="">Select…</option>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>}
          </div>
          <div>
            <label className="label">Publisher</label>
            <Input name="publisher" value={form.publisher} onChange={(e) => update("publisher", e.target.value)} />
          </div>
          <div>
            <label className="label">Publication year</label>
            <Input
              name="publication_year"
              type="number"
              value={form.publication_year}
              onChange={(e) => update("publication_year", e.target.value)}
            />
            {errors.publication_year && <p className="mt-1 text-xs text-red-600">{errors.publication_year}</p>}
          </div>
          <div>
            <label className="label">Total copies *</label>
            <Input
              name="total_copies"
              type="number"
              min={0}
              value={form.total_copies}
              onChange={(e) => update("total_copies", e.target.value)}
            />
            {errors.total_copies && <p className="mt-1 text-xs text-red-600">{errors.total_copies}</p>}
          </div>
          <div>
            <label className="label">Shelf / location</label>
            <Input
              name="shelf_location"
              value={form.shelf_location}
              onChange={(e) => update("shelf_location", e.target.value)}
            />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
              />
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
