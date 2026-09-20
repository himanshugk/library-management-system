export type Role = "ADMIN" | "STAFF";

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  staff_id: string | null;
  name: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Book {
  id: number;
  book_id: string;
  title: string;
  author: string;
  isbn: string;
  category_id: number;
  publisher: string | null;
  publication_year: number | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
  is_active: boolean;
  status: string;
  category_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  book_count: number;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  phone: string;
  email: string | null;
  department: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  outstanding_fine: number;
  issued_book_count: number;
}

export interface Staff {
  id: number;
  staff_id: string;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  txn_id: string;
  student_id: string;
  student_name: string;
  book_id: string;
  book_title: string;
  issued_by_staff_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  returned_by_staff_id: string | null;
  status: "ISSUED" | "RETURNED";
  overdue_days: number;
  current_fine: number;
  fine_amount: number;
  fine_status: string | null;
  created_at: string;
}

export interface ReturnResult {
  transaction: Transaction;
  overdue_days: number;
  fine: number;
  message: string;
}

export interface Fine {
  id: number;
  txn_id: string;
  student_id: string;
  student_name: string;
  book_title: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: "NONE" | "UNPAID" | "PARTIALLY_PAID" | "PAID";
  created_at: string;
}

export interface FinePayment {
  id: number;
  fine_id: number;
  txn_id: string;
  student_id: string;
  student_name: string;
  book_title: string;
  amount: number;
  method: string;
  paid_at: string;
  collected_by_staff_id: string;
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  student_id: string;
  student_name: string;
  txn_id: string | null;
  phone: string;
  ntype: string;
  message: string;
  provider: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_books: number;
  available_books: number;
  issued_books: number;
  total_students: number;
  active_students: number;
  total_staff: number;
  overdue_books: number;
  outstanding_fines: number;
  books_returned_today: number;
  books_issued_today: number;
  loan_period_days: number;
  fine_per_day: number;
}

export interface StudentHistoryItem {
  transaction_id: string;
  book_title: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  overdue_days: number;
  current_fine: number;
}

export interface AppConfig {
  loan_period_days: number;
  fine_per_day: number;
  max_books_per_student: number;
  app_name: string;
}
