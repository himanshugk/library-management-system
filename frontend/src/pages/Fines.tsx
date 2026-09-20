import { useEffect, useState } from "react";
import { finesApi } from "@/services/api";
import type { Fine } from "@/types";
import { Badge, Button, EmptyState, Input, Modal, PageHeader, Spinner, statusTone } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function Fines() {
  const toast = useToast();
  const [items, setItems] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [payTarget, setPayTarget] = useState<Fine | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await finesApi.list(status || undefined));
    } catch (err) {
      toast(apiError(err, "Failed to load fines."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPay(f: Fine) {
    setPayTarget(f);
    setAmount(String(f.remaining_amount));
    setMethod("CASH");
    setNotes("");
  }

  async function submitPay() {
    if (!payTarget) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast("Enter a valid amount.", "error");
      return;
    }
    if (value > payTarget.remaining_amount) {
      toast(`Amount cannot exceed Rs ${payTarget.remaining_amount}.`, "error");
      return;
    }
    setBusy(true);
    try {
      await finesApi.pay(payTarget.id, value, method, notes || undefined);
      toast("Payment recorded.", "success");
      setPayTarget(null);
      await load();
    } catch (err) {
      toast(apiError(err, "Could not record payment."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function payInFull(f: Fine) {
    setBusy(true);
    try {
      await finesApi.payInFull(f.id);
      toast("Fine paid in full.", "success");
      await load();
    } catch (err) {
      toast(apiError(err, "Could not record payment."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fines"
        subtitle="Rs 10 per overdue day, calculated by the backend on return"
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <div className="mb-4 flex max-w-sm gap-2">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All (excluding NONE)</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially paid</option>
          <option value="PAID">Paid</option>
        </select>
        <Button variant="secondary" onClick={load}>Filter</Button>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Book</th>
                <th className="th">Student</th>
                <th className="th">Amount</th>
                <th className="th">Paid</th>
                <th className="th">Remaining</th>
                <th className="th">Status</th>
                <th className="th">Created</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="td font-medium">{f.book_title}<span className="block font-mono text-xs text-slate-400">{f.txn_id}</span></td>
                  <td className="td">{f.student_name}<span className="block font-mono text-xs text-slate-400">{f.student_id}</span></td>
                  <td className="td">Rs {f.amount}</td>
                  <td className="td">Rs {f.paid_amount}</td>
                  <td className="td font-bold">Rs {f.remaining_amount}</td>
                  <td className="td"><Badge tone={statusTone(f.status)}>{f.status}</Badge></td>
                  <td className="td">{formatDate(f.created_at)}</td>
                  <td className="td">
                    {f.remaining_amount > 0 ? (
                      <div className="flex gap-2">
                        <button className="text-sm text-primary-600 hover:underline" onClick={() => openPay(f)}>
                          Pay
                        </button>
                        <button className="text-sm text-emerald-600 hover:underline" onClick={() => payInFull(f)} disabled={busy}>
                          Full
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState title="No fines" hint="Fines appear here when late books are returned." />}
        </div>
      )}
      <Modal open={payTarget !== null} title={`Record payment (${payTarget?.txn_id})`} onClose={() => setPayTarget(null)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Outstanding: <b>Rs {payTarget?.remaining_amount}</b>
          </p>
          <div>
            <label className="label">Amount (Rs)</label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button onClick={submitPay} disabled={busy}>{busy ? "Saving…" : "Record payment"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
