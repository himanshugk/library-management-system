import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionsApi } from "@/services/api";
import type { Transaction } from "@/types";
import { Button, Card, FieldError, Input, PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError, formatDate } from "@/lib/utils";

const schema = z.object({
  student_id: z.string().min(1, "Student ID is required (e.g. STU-000001)"),
  book_id: z.string().min(1, "Book ID is required (e.g. BOOK-000001)"),
});

type FormValues = z.infer<typeof schema>;

export default function IssueBook() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    setResult(null);
    try {
      const txn = await transactionsApi.issue(values.student_id.trim(), values.book_id.trim());
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Student ID *</label>
              <Input placeholder="STU-000001" {...register("student_id")} />
              <FieldError message={errors.student_id?.message} />
            </div>
            <div>
              <label className="label">Book ID *</label>
              <Input placeholder="BOOK-000001" {...register("book_id")} />
              <FieldError message={errors.book_id?.message} />
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
