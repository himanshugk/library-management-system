import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { staffApi } from "@/services/api";
import type { Staff } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDateTime } from "@/lib/utils";

export default function StaffPage() {
  const toast = useToast();
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    staffApi
      .list()
      .then(setItems)
      .catch((err) => toast(apiError(err, "Failed to load staff."), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((s) => {
    if (!search) return true;
    return `${s.staff_id} ${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Staff (admin only)"
        subtitle={`${filtered.length} accounts`}
        actions={
          <Link to="/staff/new">
            <Button>Add staff</Button>
          </Link>
        }
      />
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search staff ID, name, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Staff ID</th>
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Last login</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.staff_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td font-mono text-xs">{s.staff_id}</td>
                <td className="td font-medium">{s.name}</td>
                <td className="td">{s.email}</td>
                <td className="td">
                  <Badge tone={s.role === "ADMIN" ? "amber" : "blue"}>{s.role}</Badge>
                </td>
                <td className="td">
                  <Badge tone={s.is_active ? "green" : "red"}>{s.is_active ? "ACTIVE" : "INACTIVE"}</Badge>
                </td>
                <td className="td">{formatDateTime(s.last_login_at)}</td>
                <td className="td">
                  <Link to={`/staff/${s.staff_id}`} className="text-sm text-primary-600 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState title="No staff found" />}
      </div>
    </div>
  );
}
