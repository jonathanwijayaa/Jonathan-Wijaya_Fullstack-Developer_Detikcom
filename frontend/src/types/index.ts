export type UserRole = "ADMIN" | "INTERN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Attendance {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "PRESENT" | "LATE";
}