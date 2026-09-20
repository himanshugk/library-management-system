import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { transactionsApi } from "@/services/api";
import type { ReturnResult, Transaction } from "@/types";
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Spinner, statusTone } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function Transactions() {
  const toast = useToast();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [returnTarget, setReturnTarget] = useState<Transaction | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await transactionsApi.list({ search: search || undefined, status: status || undefined }));
    } catch (err) {
      toast(apiError(err, "Failed to load transactions."), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doReturn() {
    if (!returnTarget) return;
    setBusy(true);
    try {
      const res = await transactionsApi.returnBook(returnTarget.txn_id);
      setReturnResult(res);
      setReturnTarget(null);
      await load();
    } catch (err) {
      toast(apiError(err, "Could not return the book."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${items.length} records`}
        actions={
          <Link to="/transactions/issue">
            <Button>Issue a book</Button>
          </Link>
        }
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search txn, student, book…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ISSUED">Issued</option>
          <option value="RETURNED">Returned</option>
        </select>
        <Button variant="secondary" onClick={load}>
          Search
        </Button>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Txn ID</th>
                <th className="th">Student</th>
                <th className="th">Book</th>
                <th className="th">Issued</th>
                <th className="th">Due</th>
                <th className="th">Status</th>
                <th className="th">Fine</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.txn_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="td font-mono text-xs">{t.txn_id}</td>
                  <td className="td">
                    {t.student_name}
                    <span className="block font-mono text-xs text-slate-400">{t.student_id}</span>
                  </td>
                  <td className="td">
                    {t.book_title}
                    <span className="block font-mono text-xs text-slate-400">{t.book_id}</span>
                  </td>
                  <td className="td">{formatDate(t.issue_date)}</td>
                  <td className="td">{formatDate(t.due_date)}</td>
                  <td className="td">
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                    {t.status === "ISSUED" && t.overdue_days > 0 && (
                      <span className="ml-1">
                        <Badge tone="red">{t.overdue_days}d overdue</Badge>
                      </span>
                    )}
                  </td>
                  <td className="td">
                    {t.status === "RETURNED" ? `Rs ${t.fine_amount}` : t.current_fine > 0 ? `Rs ${t.current_fine}*` : "—"}
                  </td>
                  <td className="td">
                    {t.status === "ISSUED" ? (
                      <button className="text-sm text-primary-600 hover:underline" onClick={() => setReturnTarget(t)}>
                        Return
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">{formatDate(t.return_date)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <EmptyState title="No transactions found" />}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">* live fine for books not yet returned.</p>

      <ConfirmDialog
        open={returnTarget !== null}
        title={`Return "${returnTarget?.book_title}"?`}
        message={`Student: ${returnTarget?.student_name} (${returnTarget?.student_id}). The backend will finalise any overdue fine.`}
        confirmLabel="Return book"
        busy={busy}
        onConfirm={doReturn}
        onClose={() => setReturnTarget(null)}
      />

      <Modal open={returnResult !== null} title="Return recorded" onClose={() => setReturnResult(null)}>
        {returnResult && (
          <div className="space-y-3 text-sm">
            <p>
              <b>{returnResult.transaction.book_title}</b> returned by {returnResult.transaction.student_name}.
            </p>
            <p>
              Overdue days: <b>{returnResult.overdue_days}</b>
            </p>
            <p className="text-lg font-bold">
              {returnResult.fine === 0 ? "No fine due." : `Fine: Rs ${returnResult.fine}`}
            </p>
            {returnResult.fine > 0 && (
              <Link to="/fines">
                <Button>Record payment in Fines →</Button>
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
