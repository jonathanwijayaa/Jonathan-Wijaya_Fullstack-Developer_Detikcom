import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  RefreshCw,
} from "lucide-react";

import api from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

interface DashboardData {
  totalInterns: number;
  today: {
    totalAttendance: number;
    present: number;
    late: number;
    notCheckedIn: number;
  };
}
interface RecentAttendance {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "PRESENT" | "LATE";
  intern_name: string;
  intern_code: string;
}

const initialData: DashboardData = {
  totalInterns: 0,
  today: {
    totalAttendance: 0,
    present: 0,
    late: 0,
    notCheckedIn: 0,
  },
};

const statCards = [
  {
    title: "Total Interns",
    value: (data: DashboardData) => data.totalInterns,
    icon: Users,
    description: "Total registered interns",
  },
  {
    title: "Present Today",
    value: (data: DashboardData) => data.today.present,
    icon: UserCheck,
    description: "Interns present today",
  },
  {
    title: "Late Today",
    value: (data: DashboardData) => data.today.late,
    icon: Clock,
    description: "Interns arriving late",
  },
  {
    title: "Not Checked In",
    value: (data: DashboardData) => data.today.notCheckedIn,
    icon: UserX,
    description: "Interns not yet checked in",
  },
];

export default function AdminDashboard() {
    const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(initialData);
  const [recentAttendances, setRecentAttendances] = useState<RecentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const fetchDashboard = async () => {
  try {
    setLoading(true);
    setError("");

    const [dashboardResponse, attendanceResponse] = await Promise.all([
      api.get("/dashboard/admin"),
      api.get("/dashboard/admin/recent-attendance"),
    ]);

    setData(dashboardResponse.data.data);
    setRecentAttendances(attendanceResponse.data.data);
  } catch (err) {
    console.error("Failed to fetch dashboard:", err);
    setError("Failed to load dashboard data. Please try again.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                    Welcome back, {user?.name || "Admin"}!
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                    Monitor intern attendance and manage your internship program.
                    </p>
                </div>

                <Badge variant="secondary">
                    Administrator
                </Badge>
                </div>
            </CardContent>
            </Card>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchDashboard}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {item.title}
                </CardTitle>

                <Icon size={18} className="text-slate-400" />
              </CardHeader>

              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? "..." : item.value(data)}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
            <CardTitle className="text-lg">
            Recent Attendance
            </CardTitle>

            <p className="text-sm text-slate-500">
            Latest attendance records from all interns.
            </p>
        </CardHeader>

        <CardContent>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 font-medium">Intern</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Check In</th>
                    <th className="pb-3 font-medium">Check Out</th>
                    <th className="pb-3 font-medium">Status</th>
                </tr>
                </thead>

                <tbody>
                {loading ? (
                    <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                        Loading attendance records...
                    </td>
                    </tr>
                ) : recentAttendances.length === 0 ? (
                    <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                        No attendance records found.
                    </td>
                    </tr>
                ) : (
                    recentAttendances.map((attendance) => (
                    <tr key={attendance.id} className="border-b last:border-0">
                        <td className="py-4">
                        <div className="font-medium text-slate-900">
                            {attendance.intern_name}
                        </div>
                        <div className="text-xs text-slate-500">
                            {attendance.intern_code}
                        </div>
                        </td>

                        <td className="py-4">
                        {new Date(
                            `${attendance.attendance_date}T00:00:00`
                        ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                        </td>

                        <td className="py-4">
                        {attendance.check_in
                            ? new Date(attendance.check_in).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Jakarta",
                            })
                            : "-"}
                        </td>

                        <td className="py-4">
                        {attendance.check_out
                            ? new Date(attendance.check_out).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Jakarta",
                            })
                            : "-"}
                        </td>

                        <td className="py-4">
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            attendance.status === "LATE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                        >
                            {attendance.status}
                        </span>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        </CardContent>
        </Card>
    </div>
  );
}
