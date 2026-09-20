import { useEffect, useState } from "react";
import { transactionsApi } from "@/services/api";
import type { Transaction } from "@/types";
import { Badge, Button, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function Overdue() {
  const toast = useToast();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems(await transactionsApi.overdue());
    } catch (err) {
      toast(apiError(err, "Failed to load overdue books."), "error");
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
      <PageHeader
        title="Overdue books"
        subtitle="Issued books past their 20-day due date. First-overdue SMS is sent automatically by the backend job."
        actions={<Button variant="secondary" onClick={load}>Refresh</Button>}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Txn</th>
              <th className="th">Student</th>
              <th className="th">Book</th>
              <th className="th">Due date</th>
              <th className="th">Overdue</th>
              <th className="th">Live fine</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.txn_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="td font-mono text-xs">{t.txn_id}</td>
                <td className="td">{t.student_name}<span className="block font-mono text-xs text-slate-400">{t.student_id}</span></td>
                <td className="td">{t.book_title}</td>
                <td className="td">{formatDate(t.due_date)}</td>
                <td className="td"><Badge tone="red">{t.overdue_days} days</Badge></td>
                <td className="td font-bold">Rs {t.current_fine}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <EmptyState title="Nothing overdue 🎉" hint="All issued books are within their loan period." />}
      </div>
    </div>
  );
}
