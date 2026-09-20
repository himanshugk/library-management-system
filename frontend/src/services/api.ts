import axios from "axios";
import type {
  AppConfig,
  AuditLog,
  Book,
  Category,
  DashboardStats,
  Fine,
  FinePayment,
  LoginResponse,
  Notification,
  ReturnResult,
  Staff,
  Student,
  StudentHistoryItem,
  Transaction,
} from "@/types";

// In development the Vite proxy forwards /api to localhost:8000.
// In production (Vercel/Render) set VITE_API_URL to the backend URL.
const baseURL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      const url = error?.config?.url ?? "";
      if (!url.includes("/auth/login")) {
        localStorage.removeItem("lms_token");
        localStorage.removeItem("lms_user");
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { username, password }).then((r) => r.data),
  logout: () => api.post("/api/auth/logout").then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
  changePassword: (old_password: string, new_password: string) =>
    api.post("/api/auth/change-password", { old_password, new_password }),
};

export const configApi = {
  get: () => api.get<AppConfig>("/api/config").then((r) => r.data),
};

export const dashboardApi = {
  stats: () => api.get<DashboardStats>("/api/dashboard/stats").then((r) => r.data),
};

export const studentsApi = {
  list: (search?: string) =>
    api.get<Student[]>("/api/students", { params: { search: search || undefined } }).then((r) => r.data),
  get: (id: string) => api.get<Student>(`/api/students/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post<Student>("/api/students", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Student>(`/api/students/${id}`, data).then((r) => r.data),
  setStatus: (id: string, is_active: boolean) =>
    api.patch<Student>(`/api/students/${id}/status`, { is_active }).then((r) => r.data),
  history: (id: string) =>
    api.get<StudentHistoryItem[]>(`/api/students/${id}/history`).then((r) => r.data),
  transactions: (id: string) =>
    api.get<Transaction[]>(`/api/students/${id}/transactions`).then((r) => r.data),
  fines: (id: string) =>
    api.get<Fine[]>(`/api/students/${id}/fines`).then((r) => r.data),
};

export const staffApi = {
  list: (search?: string) =>
    api.get<Staff[]>("/api/staff", { params: { search: search || undefined } }).then((r) => r.data),
  get: (id: string) => api.get<Staff>(`/api/staff/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post<Staff>("/api/staff", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Staff>(`/api/staff/${id}`, data).then((r) => r.data),
  setStatus: (id: string, is_active: boolean) =>
    api.patch<Staff>(`/api/staff/${id}/status`, { is_active }).then((r) => r.data),
  resetPassword: (id: string, new_password: string) =>
    api.post(`/api/staff/${id}/reset-password`, { new_password }),
  remove: (id: string) => api.delete(`/api/staff/${id}`),
};

export const categoriesApi = {
  list: (search?: string) =>
    api.get<Category[]>("/api/categories", { params: { search: search || undefined } }).then((r) => r.data),
  get: (id: string) => api.get<Category>(`/api/categories/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post<Category>("/api/categories", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Category>(`/api/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/categories/${id}`),
};

export const booksApi = {
  list: (params?: { search?: string; category_id?: number; availability?: string }) =>
    api.get<Book[]>("/api/books", { params }).then((r) => r.data),
  get: (id: string) => api.get<Book>(`/api/books/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post<Book>("/api/books", data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Book>(`/api/books/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/books/${id}`),
};

export const transactionsApi = {
  list: (params?: { search?: string; status?: string }) =>
    api.get<Transaction[]>("/api/transactions", { params }).then((r) => r.data),
  overdue: () => api.get<Transaction[]>("/api/transactions/overdue").then((r) => r.data),
  get: (id: string) => api.get<Transaction>(`/api/transactions/${id}`).then((r) => r.data),
  issue: (student_id: string, book_id: string) =>
    api.post<Transaction>("/api/transactions/issue", { student_id, book_id }).then((r) => r.data),
  returnBook: (txnId: string) =>
    api.post<ReturnResult>(`/api/transactions/${txnId}/return`).then((r) => r.data),
};

export const finesApi = {
  list: (status?: string) =>
    api.get<Fine[]>("/api/fines", { params: { status: status || undefined } }).then((r) => r.data),
  get: (id: number) => api.get<Fine>(`/api/fines/${id}`).then((r) => r.data),
  pay: (id: number, amount: number, method: string, notes?: string) =>
    api.post<FinePayment>(`/api/fines/${id}/payment`, { amount, method, notes }).then((r) => r.data),
  payInFull: (id: number) => api.post<Fine>(`/api/fines/${id}/pay-in-full`).then((r) => r.data),
};

export const notificationsApi = {
  list: () => api.get<Notification[]>("/api/notifications").then((r) => r.data),
  test: (student_id: string, message?: string) =>
    api.post<Notification>("/api/notifications/test", { student_id, message }).then((r) => r.data),
};

export const auditApi = {
  list: (action?: string) =>
    api.get<AuditLog[]>("/api/audit-logs", { params: { action: action || undefined } }).then((r) => r.data),
};
