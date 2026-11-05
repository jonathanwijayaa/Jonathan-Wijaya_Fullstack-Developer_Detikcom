import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import api from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { formatTime, formatDate } from "@/lib/utils";

interface UnattendedIntern {
  id: string;
  name: string;
  email: string;
  intern_code: string;
  department: string;
}

interface NotCheckedOutIntern {
  id: string;
  attendance_id: string;
  name: string;
  email: string;
  intern_code: string;
  department: string;
  check_in: string;
  status: "PRESENT" | "LATE";
}

interface DashboardData {
  totalInterns: number;
  today: {
    totalAttendance: number;
    present: number;
    late: number;
    notCheckedIn: number;
  };
  unattendedInterns?: UnattendedIntern[];
  notCheckedOutInterns?: NotCheckedOutIntern[];
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
  unattendedInterns: [],
  notCheckedOutInterns: [],
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
  const LIMIT = 10;

  const [page, setPage] = useState(1);

  const totalRecords = recentAttendances.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / LIMIT));

  const firstRow =
    totalRecords === 0 ? 0 : (page - 1) * LIMIT + 1;

  const lastRow = Math.min(page * LIMIT, totalRecords);

  const paginatedAttendances = recentAttendances.slice(
    (page - 1) * LIMIT,
    page * LIMIT
  );

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

  const unattendedList = data.unattendedInterns || [];
  const notCheckedOutList = data.notCheckedOutInterns || [];

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

        <Button
          variant="outline"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 border-border bg-card text-foreground hover:bg-muted"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"}
          />
          Refresh
        </Button>
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
                  paginatedAttendances.map((attendance) => (
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
                        {formatDate(attendance.attendance_date)}
                      </td>

                      <td className="py-4">
                        {formatTime(attendance.check_in, "-")}
                      </td>

                      <td className="py-4">
                        {formatTime(attendance.check_out, "-")}
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
          <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              {totalRecords === 0
                ? "Showing 0 of 0 records"
                : `Showing ${firstRow}–${lastRow} of ${totalRecords} records`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>

              <span className="px-2 text-sm font-medium">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operasional Harian (Additive Sections) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intern Belum Check-in Hari Ini */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Intern Belum Check-in Hari Ini
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  Daftar peserta aktif yang belum melakukan absensi masuk hari ini.
                </p>
              </div>
              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                {unattendedList.length} Intern
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">Intern</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : unattendedList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">
                        Semua peserta magang sudah check-in hari ini.
                      </td>
                    </tr>
                  ) : (
                    unattendedList.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.intern_code}</div>
                        </td>
                        <td className="py-3 text-slate-600">{item.department}</td>
                        <td className="py-3 text-right">
                          <Badge variant="secondary">Not Checked In</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Intern Belum Check-out Hari Ini */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Intern Belum Check-out Hari Ini
                </CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  Peserta yang telah check-in tetapi belum menyelesaikan sesi absensi pulang.
                </p>
              </div>
              <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                {notCheckedOutList.length} Intern
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">Intern</th>
                    <th className="pb-2 font-medium">Check In</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : notCheckedOutList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">
                        Tidak ada peserta yang tertunda check-out.
                      </td>
                    </tr>
                  ) : (
                    notCheckedOutList.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.intern_code}</div>
                        </td>
                        <td className="py-3 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <LogIn size={14} className="text-slate-400" />
                            {formatTime(item.check_in, "-")}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "LATE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.status}
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
    </div>
  );
}
