import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, BookOpen, Users } from "lucide-react";
import { dashboardApi } from "@/services/api";
import type { DashboardStats } from "@/types";
import { Button, Card, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { apiError } from "@/lib/utils";

function Stat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    dashboardApi
      .stats()
      .then(setStats)
      .catch((err) => toast(apiError(err, "Failed to load dashboard."), "error"));
  }, [toast]);

  if (!stats) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Loan period: ${stats.loan_period_days} days · Fine: Rs ${stats.fine_per_day}/day`}
        actions={
          <>
            <Link to="/transactions/issue">
              <Button>Issue a book</Button>
            </Link>
            <Link to="/transactions/overdue">
              <Button variant="secondary">View overdue</Button>
            </Link>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total book titles" value={stats.total_books} tone="text-slate-900" />
        <Stat label="Available copies" value={stats.available_books} tone="text-emerald-600" />
        <Stat label="Issued right now" value={stats.issued_books} tone="text-blue-600" />
        <Stat label="Overdue books" value={stats.overdue_books} tone="text-red-600" />
        <Stat label="Students" value={stats.total_students} tone="text-slate-900" />
        <Stat label="Staff" value={stats.total_staff} tone="text-slate-900" />
        <Stat label="Outstanding fines" value={`Rs ${stats.outstanding_fines}`} tone="text-amber-600" />
        <Stat label="Issued today" value={stats.books_issued_today} tone="text-slate-900" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-3">
          <AlertTriangle className="text-red-500" />
          <div>
            <p className="text-sm font-medium">Overdue books</p>
            <Link to="/transactions/overdue" className="text-sm text-primary-600 hover:underline">
              Open overdue list →
            </Link>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Banknote className="text-amber-500" />
          <div>
            <p className="text-sm font-medium">Rs {stats.outstanding_fines} outstanding</p>
            <Link to="/fines" className="text-sm text-primary-600 hover:underline">
              Open fines →
            </Link>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <BookOpen className="text-blue-500" />
          <div>
            <p className="text-sm font-medium">{stats.books_returned_today} returned today</p>
            <Link to="/transactions" className="text-sm text-primary-600 hover:underline">
              Open transactions →
            </Link>
          </div>
        </Card>
      </div>
      <Card className="mt-4 flex items-center gap-3">
        <Users className="text-slate-400" />
        <p className="text-sm text-slate-600">
          {stats.active_students} active students · {stats.total_students} total
        </p>
      </Card>
    </div>
  );
}
