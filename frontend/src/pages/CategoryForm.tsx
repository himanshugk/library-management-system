import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesApi } from "@/services/api";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function CategoryForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const n = name || String(data.get("name") ?? "").trim();
    const d = description || String(data.get("description") ?? "").trim();

    if (!n) {
      setError("Name is required");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await categoriesApi.create({ name: n, description: d || undefined });
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name *</label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Programming"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <Input
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
