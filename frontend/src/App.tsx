import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Books from "@/pages/Books";
import BookForm from "@/pages/BookForm";
import Categories from "@/pages/Categories";
import CategoryForm from "@/pages/CategoryForm";
import Students from "@/pages/Students";
import StudentForm from "@/pages/StudentForm";
import StudentDetail from "@/pages/StudentDetail";
import Staff from "@/pages/Staff";
import StaffForm from "@/pages/StaffForm";
import Transactions from "@/pages/Transactions";
import IssueBook from "@/pages/IssueBook";
import Overdue from "@/pages/Overdue";
import Fines from "@/pages/Fines";
import Notifications from "@/pages/Notifications";
import AuditLogs from "@/pages/AuditLogs";
import Profile from "@/pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/books" element={<Books />} />
                <Route path="/books/new" element={<BookForm />} />
                <Route path="/books/:id/edit" element={<BookForm />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/categories/new" element={<CategoryForm />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/new" element={<StudentForm />} />
                <Route path="/students/:id" element={<StudentDetail />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transactions/issue" element={<IssueBook />} />
                <Route path="/transactions/overdue" element={<Overdue />} />
                <Route path="/fines" element={<Fines />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/profile" element={<Profile />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/staff/new" element={<StaffForm />} />
                  <Route path="/staff/:id" element={<StaffForm />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
