import { useEffect, useState } from "react";
import { notificationsApi } from "@/services/api";
import type { Notification } from "@/types";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner, statusTone } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDateTime } from "@/lib/utils";

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
    } catch (err) {
      toast(apiError(err, "Failed to load notifications."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendTest() {
    if (!studentId.trim()) {
      toast("Enter a student ID first.", "error");
      return;
    }
    setBusy(true);
    try {
      await notificationsApi.test(studentId.trim(), message || undefined);
      toast("Test notification sent.", "success");
      setMessage("");
      await load();
    } catch (err) {
      toast(apiError(err, "Could not send test notification."), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Overdue SMS history + test sender" />
      <div className="card mb-4 p-4">
        <h2 className="text-sm font-semibold">Send a test SMS</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Input placeholder="STU-000001" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          <Input placeholder="Optional custom message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button onClick={sendTest} disabled={busy}>
            {busy ? "Sending…" : "Send test"}
          </Button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Student</th>
              <th className="th">Type</th>
              <th className="th">Message</th>
              <th className="th">Provider</th>
              <th className="th">Status</th>
              <th className="th">Sent</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td">{n.student_name}<span className="block font-mono text-xs text-slate-400">{n.phone}</span></td>
                <td className="td"><Badge>{n.ntype}</Badge></td>
                <td className="td max-w-xs truncate" title={n.message}>{n.message}</td>
                <td className="td">{n.provider}</td>
                <td className="td"><Badge tone={statusTone(n.status)}>{n.status}</Badge></td>
                <td className="td">{formatDateTime(n.sent_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <EmptyState title="No notifications yet" />}
      </div>
    </div>
  );
}
