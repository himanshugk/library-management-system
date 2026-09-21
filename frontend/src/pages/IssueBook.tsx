import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { transactionsApi } from "@/services/api";
import type { Transaction } from "@/types";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

export default function IssueBook() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ student_id: "", book_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const student_id = (form.student_id || String(fd.get("student_id") ?? "")).trim();
    const book_id = (form.book_id || String(fd.get("book_id") ?? "")).trim();

    const errs: Record<string, string> = {};
    if (!student_id) errs.student_id = "Student ID is required (e.g. STU-000001)";
    if (!book_id) errs.book_id = "Book ID is required (e.g. BOOK-000001)";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setResult(null);
    try {
      const txn = await transactionsApi.issue(student_id, book_id);
      setResult(txn);
      toast(`Issued. Due on ${formatDate(txn.due_date)} (20-day loan).`, "success");
    } catch (err) {
      toast(apiError(err, "Could not issue the book."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Issue a book" subtitle="Due date = issue date + 20 days, calculated by the backend" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Student ID *</label>
              <Input
                name="student_id"
                placeholder="STU-000001"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              />
              {errors.student_id && <p className="mt-1 text-xs text-red-600">{errors.student_id}</p>}
            </div>
            <div>
              <label className="label">Book ID *</label>
              <Input
                name="book_id"
                placeholder="BOOK-000001"
                value={form.book_id}
                onChange={(e) => setForm({ ...form, book_id: e.target.value })}
              />
              {errors.book_id && <p className="mt-1 text-xs text-red-600">{errors.book_id}</p>}
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Issuing…" : "Issue book"}
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-800">Result</h2>
          {!result ? (
            <p className="mt-2 text-sm text-slate-500">
              Fill in the IDs and issue. The backend checks: student exists and is active, book exists
              and is active, copies available, borrowing limit, and no duplicate active issue.
            </p>
          ) : (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Transaction</dt><dd className="font-mono">{result.txn_id}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Book</dt><dd className="font-medium">{result.book_title}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Student</dt><dd>{result.student_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Issue date</dt><dd>{formatDate(result.issue_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Due date</dt><dd className="font-bold">{formatDate(result.due_date)}</dd></div>
            </dl>
          )}
          <Link to="/transactions" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            View all transactions →
          </Link>
        </Card>
      </div>
    </div>
  );
}
