import { useEffect, useState } from "react";
import { auditApi } from "@/services/api";
import type { AuditLog } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDateTime } from "@/lib/utils";

export default function AuditLogs() {
  const toast = useToast();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  async function load(filter?: string) {
    setLoading(true);
    try {
      setItems(await auditApi.list(filter || undefined));
    } catch (err) {
      toast(apiError(err, "Failed to load audit logs."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Every important action, who did it, and when" />
      <div className="mb-4 flex max-w-md gap-2">
        <Input placeholder="Filter by action (e.g. issue_book)" value={action} onChange={(e) => setAction(e.target.value)} />
        <Button variant="secondary" onClick={() => load(action)}>Filter</Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">When</th>
              <th className="th">User</th>
              <th className="th">Action</th>
              <th className="th">Entity</th>
              <th className="th">Entity ID</th>
              <th className="th">Details</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                <td className="td">{l.username ?? "—"}</td>
                <td className="td"><Badge>{l.action}</Badge></td>
                <td className="td">{l.entity ?? "—"}</td>
                <td className="td font-mono text-xs">{l.entity_id ?? "—"}</td>
                <td className="td max-w-xs truncate text-xs" title={l.details ?? ""}>{l.details ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <EmptyState title="No audit logs" />}
      </div>
    </div>
  );
}
