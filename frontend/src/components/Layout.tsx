import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Bell,
  BookOpen,
  LayoutDashboard,
  Library,
  LogOut,
  ReceiptText,
  ScrollText,
  Tags,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"] },
  { to: "/books", label: "Books", icon: BookOpen, roles: ["ADMIN", "STAFF"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["ADMIN", "STAFF"] },
  { to: "/students", label: "Students", icon: Users, roles: ["ADMIN", "STAFF"] },
  { to: "/transactions", label: "Transactions", icon: ReceiptText, roles: ["ADMIN", "STAFF"] },
  { to: "/transactions/issue", label: "Issue Book", icon: Library, roles: ["ADMIN", "STAFF"] },
  { to: "/transactions/overdue", label: "Overdue", icon: AlertTriangle, roles: ["ADMIN", "STAFF"] },
  { to: "/fines", label: "Fines", icon: Banknote, roles: ["ADMIN", "STAFF"] },
  { to: "/staff", label: "Staff", icon: User, roles: ["ADMIN"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "STAFF"] },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["ADMIN", "STAFF"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const visible = links.filter((l) => user && l.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-lg text-white">📚</span>
        <span className="text-sm font-bold leading-tight text-slate-900">
          Library
          <br />
          Management
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {visible.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100",
              )
            }
          >
            <l.icon size={17} />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-100"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
            {(user?.name ?? user?.username ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-800">{user?.name ?? user?.username}</span>
            <span className="block text-xs text-slate-400">
              {user?.staff_id} · {user?.role}
            </span>
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={17} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-medium text-slate-500">
            {user?.staff_id} · {user?.role}
          </span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
