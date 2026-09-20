import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { booksApi, categoriesApi } from "@/services/api";
import type { Book, Category } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner, statusTone } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

export default function Books() {
  const toast = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [availability, setAvailability] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([booksApi.list(), categoriesApi.list()]);
      setBooks(b);
      setCategories(c);
    } catch (err) {
      toast(apiError(err, "Failed to load books."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = books.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      const hay = `${b.book_id} ${b.title} ${b.author} ${b.isbn} ${b.category_name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (categoryId && String(b.category_id) !== categoryId) return false;
    if (availability === "available" && !(b.is_active && b.available_copies > 0)) return false;
    if (availability === "out" && (b.is_active && b.available_copies > 0)) return false;
    return true;
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Books"
        subtitle={`${filtered.length} of ${books.length} titles`}
        actions={
          <Link to="/books/new">
            <Button>Add book</Button>
          </Link>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search title, author, ISBN, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="">All availability</option>
          <option value="available">Available</option>
          <option value="out">Out / inactive</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Book ID</th>
              <th className="th">Title</th>
              <th className="th">Author</th>
              <th className="th">Category</th>
              <th className="th">Copies</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.book_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td font-mono text-xs">{b.book_id}</td>
                <td className="td font-medium">{b.title}</td>
                <td className="td">{b.author}</td>
                <td className="td">{b.category_name}</td>
                <td className="td">
                  {b.available_copies}/{b.total_copies}
                </td>
                <td className="td">
                  <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                </td>
                <td className="td">
                  <Link to={`/books/${b.book_id}/edit`} className="text-sm text-primary-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title="No books found" hint="Try a different search or add a new book." />}
      </div>
    </div>
  );
}
