import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentsApi } from "@/services/api";
import type { Fine, Student, StudentHistoryItem, Transaction } from "@/types";
import { Badge, Button, Card, ConfirmDialog, Input, Modal, PageHeader, Spinner, statusTone } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StudentHistoryItem[]>([]);
  const [issued, setIssued] = useState<Transaction[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", department: "", address: "" });

  async function load() {
    if (!id) return;
    try {
      const [s, h, t, f] = await Promise.all([
        studentsApi.get(id),
        studentsApi.history(id),
        studentsApi.transactions(id),
        studentsApi.fines(id),
      ]);
      setStudent(s);
      setHistory(h);
      setIssued(t.filter((x) => x.status === "ISSUED"));
      setFines(f);
      setForm({
        name: s.name,
        phone: s.phone,
        email: s.email ?? "",
        department: s.department ?? "",
        address: s.address ?? "",
      });
    } catch (err) {
      toast(apiError(err, "Failed to load student."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdit() {
    if (!id) return;
    setBusy(true);
    try {
      const payload = { ...form, email: form.email || undefined };
      await studentsApi.update(id, payload as Record<string, unknown>);
      toast("Student updated.", "success");
      setEditing(false);
      await load();
    } catch (err) {
      toast(apiError(err, "Could not update the student."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!id || !student) return;
    setBusy(true);
    try {
      await studentsApi.setStatus(id, !student.is_active);
      toast(student.is_active ? "Student disabled." : "Student enabled.", "success");
      setConfirmStatus(false);
      await load();
    } catch (err) {
      toast(apiError(err, "Could not change status."), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  if (!student) return <p className="text-sm text-slate-500">Student not found.</p>;

  return (
    <div>
      <PageHeader
        title={`${student.student_id} · ${student.name}`}
        subtitle={`${student.phone}${student.email ? ` · ${student.email}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant={student.is_active ? "danger" : "success"} onClick={() => setConfirmStatus(true)}>
              {student.is_active ? "Disable" : "Enable"}
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Status</p>
          <p className="mt-1">
            <Badge tone={student.is_active ? "green" : "red"}>{student.is_active ? "ACTIVE" : "INACTIVE"}</Badge>
          </p>
          <p className="mt-3 text-xs font-medium uppercase text-slate-500">Department</p>
          <p className="text-sm">{student.department ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Currently issued</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{student.issued_book_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Outstanding fine</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">Rs {student.outstanding_fine}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate("/fines")}>
            Open fines
          </Button>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Currently issued books</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Txn</th>
              <th className="th">Book</th>
              <th className="th">Due date</th>
              <th className="th">Overdue</th>
              <th className="th">Fine</th>
            </tr>
          </thead>
          <tbody>
            {issued.map((t) => (
              <tr key={t.txn_id} className="border-b border-slate-100 last:border-0">
                <td className="td font-mono text-xs">{t.txn_id}</td>
                <td className="td">{t.book_title}</td>
                <td className="td">{formatDate(t.due_date)}</td>
                <td className="td">{t.overdue_days > 0 ? <Badge tone="red">{t.overdue_days} days</Badge> : "—"}</td>
                <td className="td">Rs {t.current_fine}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {issued.length === 0 && <p className="p-4 text-sm text-slate-500">No books currently issued.</p>}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Borrowing history</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Txn</th>
              <th className="th">Book</th>
              <th className="th">Issued</th>
              <th className="th">Due</th>
              <th className="th">Returned</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.transaction_id} className="border-b border-slate-100 last:border-0">
                <td className="td font-mono text-xs">{h.transaction_id}</td>
                <td className="td">{h.book_title}</td>
                <td className="td">{formatDate(h.issue_date)}</td>
                <td className="td">{formatDate(h.due_date)}</td>
                <td className="td">{formatDate(h.return_date)}</td>
                <td className="td">
                  <Badge tone={statusTone(h.status)}>{h.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="p-4 text-sm text-slate-500">No history yet.</p>}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Fine history</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Book</th>
              <th className="th">Amount</th>
              <th className="th">Paid</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0">
                <td className="td">{f.book_title}</td>
                <td className="td">Rs {f.amount}</td>
                <td className="td">Rs {f.paid_amount}</td>
                <td className="td">
                  <Badge tone={statusTone(f.status)}>{f.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {fines.length === 0 && <p className="p-4 text-sm text-slate-500">No fines.</p>}
      </div>

      <Modal open={editing} title="Edit student" onClose={() => setEditing(false)}>
        <div className="grid gap-3">
          <div>
            <label className="label">Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Department</label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Address</label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmStatus}
        title={student.is_active ? "Disable this student?" : "Enable this student?"}
        message={
          student.is_active
            ? "Disabled students cannot borrow books. History is kept."
            : "The student will be able to borrow books again."
        }
        confirmLabel={student.is_active ? "Disable" : "Enable"}
        busy={busy}
        onConfirm={toggleStatus}
        onClose={() => setConfirmStatus(false)}
      />
    </div>
  );
}
