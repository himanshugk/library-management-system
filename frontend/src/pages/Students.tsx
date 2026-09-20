import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { studentsApi } from "@/services/api";
import type { Student } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function Students() {
  const toast = useToast();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    studentsApi
      .list(debounced)
      .then(setItems)
      .catch((err) => toast(apiError(err, "Failed to load students."), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${items.length} students`}
        actions={
          <Link to="/students/new">
            <Button>Add student</Button>
          </Link>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search ID, name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Student ID</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Issued</th>
                <th className="th">Fine</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.student_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="td font-mono text-xs">
                    <Link to={`/students/${s.student_id}`} className="text-primary-600 hover:underline">
                      {s.student_id}
                    </Link>
                  </td>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td">{s.phone}</td>
                  <td className="td">{s.issued_book_count}</td>
                  <td className="td">Rs {s.outstanding_fine}</td>
                  <td className="td">
                    <Badge tone={s.is_active ? "green" : "red"}>{s.is_active ? "ACTIVE" : "INACTIVE"}</Badge>
                  </td>
                  <td className="td">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState title="No students found" />}
        </div>
      )}
    </div>
  );
}
