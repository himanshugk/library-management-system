import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "@/services/api";
import type { Category } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function Categories() {
  const toast = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    categoriesApi
      .list()
      .then(setItems)
      .catch((err) => toast(apiError(err, "Failed to load categories."), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((c) => {
    if (!search) return true;
    return `${c.category_id} ${c.name}`.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${filtered.length} categories`}
        actions={
          <Link to="/categories/new">
            <Button>Add category</Button>
          </Link>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Category ID</th>
              <th className="th">Name</th>
              <th className="th">Books</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.category_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td font-mono text-xs">{c.category_id}</td>
                <td className="td font-medium">{c.name}</td>
                <td className="td">{c.book_count}</td>
                <td className="td">
                  <Badge tone={c.is_active ? "green" : "red"}>{c.is_active ? "ACTIVE" : "INACTIVE"}</Badge>
                </td>
                <td className="td">
                  <CategoryActions category={c} onChanged={() => categoriesApi.list().then(setItems).catch(() => undefined)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title="No categories found" />}
      </div>
    </div>
  );
}

import { useState as useDeleteState } from "react";
import { ConfirmDialog } from "@/components/ui";
import { useToast as useDeleteToast } from "@/components/Toast";

function CategoryActions({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const toast = useDeleteToast();
  const [busy, setBusy] = useDeleteState(false);
  const [confirm, setConfirm] = useDeleteState(false);

  async function onDelete() {
    setBusy(true);
    try {
      await categoriesApi.remove(category.category_id);
      toast("Category deleted.", "success");
      onChanged();
    } catch (err) {
      toast(apiError(err, "Could not delete the category."), "error");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <EditCategoryLink id={category.category_id} />
        <button className="text-sm text-red-600 hover:underline" onClick={() => setConfirm(true)}>
          Delete
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this category?"
        message={
          category.book_count > 0
            ? "This category has books assigned. The backend will reject the delete — reassign the books first."
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        busy={busy}
        onConfirm={onDelete}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

function EditCategoryLink({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const toast = useToast();

  async function openEditor() {
    try {
      const c = await categoriesApi.get(id);
      setName(c.name);
      setDescription(c.description ?? "");
      setOpen(true);
    } catch (err) {
      toast(apiError(err, "Failed to load category."), "error");
    }
  }

  async function save() {
    try {
      await categoriesApi.update(id, { name, description });
      toast("Category updated.", "success");
      setOpen(false);
      window.location.reload();
    } catch (err) {
      toast(apiError(err, "Could not update the category."), "error");
    }
  }

  return (
    <>
      <button className="text-sm text-primary-600 hover:underline" onClick={openEditor}>
        Edit
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold">Edit category {id}</h2>
            <label className="label mt-3">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <label className="label mt-3">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
