import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  LogIn,
  LogOut,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  InternProfile,
  TodayAttendance,
  AttendanceRecord,
  DashboardResponse,
} from "@/types";
import { formatTime, formatDate, formatDuration } from "@/lib/utils";

const LIMIT = 10;

export default function InternDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [today, setToday] = useState<TodayAttendance | null>(null);

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [monthFilter, setMonthFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Change password states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Buka otomatis dialog jika user wajib ganti password pertama kali
  useEffect(() => {
    if (user?.mustChangePassword) {
      setPasswordDialogOpen(true);
    }
  }, [user]);

  const totalPages = Math.ceil(totalRecords / LIMIT);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, historyResponse] = await Promise.all([
        api.get("/dashboard/intern"),
        api.get("/attendance/me", {
          params: { page, limit: LIMIT, month: monthFilter || undefined },
        }),
      ]);

      const dashboardData: DashboardResponse = dashboardResponse.data.data;
      setProfile(dashboardData.profile);
      setToday(dashboardData.today);

      const responseData = historyResponse.data.data;
      const attendanceData = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.history)
        ? responseData.history
        : Array.isArray(responseData?.attendances)
        ? responseData.attendances
        : Array.isArray(responseData?.records)
        ? responseData.records
        : [];

      setHistory(attendanceData);

      const total =
        historyResponse.data.pagination?.total ??
        responseData?.pagination?.total ??
        attendanceData.length;

      setTotalRecords(total);
    } catch (err) {
      console.error("Failed to fetch intern dashboard:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, monthFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAttendance = async (type: "check-in" | "check-out") => {
    try {
      setActionLoading(true);
      setError("");
      setActionMessage("");

      await api.post(`/attendance/${type}`);

      setActionMessage(
        type === "check-in"
          ? "Check-in successful!"
          : "Check-out successful!"
      );

      await fetchDashboard();
    } catch (err: any) {
      console.error(`${type} failed:`, err);

      setError(
        err.response?.data?.message ||
          `Failed to ${type}. Please try again.`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post("/auth/change-password", { newPassword });

      setPasswordSuccess("Password berhasil diubah!");
      setNewPassword("");
      setConfirmPassword("");

      // Update user state di local storage
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.mustChangePassword = false;
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      setTimeout(() => {
        setPasswordDialogOpen(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.message || "Gagal mengubah password. Silakan coba lagi."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const hasCheckedIn = Boolean(today?.check_in);
  const hasCheckedOut = Boolean(today?.check_out);

  return (
    <div className="space-y-8">
      {/* Dashboard Heading */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Welcome back, {user?.name || "Intern"}!
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your daily attendance and view your attendance history.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {profile?.intern_code || "-"}
                </Badge>

                <span className="text-sm text-slate-500">
                  {profile?.department || "-"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setPasswordDialogOpen(true);
              }}
              className="gap-2"
            >
              <KeyRound size={16} />
              Ganti Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success Message */}
      {actionMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {actionMessage}
        </div>
      )}

      {/* Today's Attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Today's Attendance</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              <CalendarDays className="mr-1 inline h-4 w-4" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              })}
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                <LogIn size={18} />
                Check In
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {loading ? "..." : formatTime(today?.check_in, "--:--")}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                <LogOut size={18} />
                Check Out
              </div>

              <p className="text-3xl font-bold text-slate-900">
                {loading ? "..." : formatTime(today?.check_out, "--:--")}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>

              {loading ? (
                <Badge variant="secondary">Loading</Badge>
              ) : !hasCheckedIn ? (
                <Badge variant="secondary">Not Checked In</Badge>
              ) : today?.status === "LATE" ? (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  Late
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Present
                </Badge>
              )}
            </div>

            {!hasCheckedIn ? (
              <Button
                onClick={() => handleAttendance("check-in")}
                disabled={loading || actionLoading}
                className="sm:min-w-40"
              >
                <LogIn className="mr-2 h-4 w-4" />
                {actionLoading ? "Processing..." : "Check In"}
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                onClick={() => handleAttendance("check-out")}
                disabled={loading || actionLoading}
                className="sm:min-w-40"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {actionLoading ? "Processing..." : "Check Out"}
              </Button>
            ) : (
              <Button disabled className="sm:min-w-40">
                Attendance Completed
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Attendance History</CardTitle>
            <p className="text-sm text-slate-500">
              Your recent attendance records.
            </p>
          </div>

          {/* Filter Tanggal/Bulan di Sisi Kanan Label Attendance History */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Bulan:</span>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-36 text-xs"
            />
            {monthFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonthFilter("");
                  setPage(1);
                }}
                className="h-8 px-2 text-xs text-red-500 hover:text-red-700"
              >
                Reset
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Check In</th>
                  <th className="pb-3 font-medium">Check Out</th>
                  <th className="pb-3 font-medium">Duration</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Loading attendance history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b last:border-0"
                    >
                      <td className="py-4">
                        {formatDate(record.attendance_date)}
                      </td>

                      <td className="py-4">
                        {formatTime(record.check_in, "--:--")}
                      </td>

                      <td className="py-4">
                        {formatTime(record.check_out, "--:--")}
                      </td>

                      <td className="py-4 font-mono text-xs">
                        {record.duration || formatDuration(record.check_in, record.check_out)}
                      </td>

                      <td className="py-4">
                        {record.status === "LATE" ? (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Late
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Present
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalRecords > 0 && (
            <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * LIMIT + 1}–
                {Math.min(page * LIMIT, totalRecords)} of {totalRecords} records
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>

                <span className="px-2 text-sm font-medium">
                  {page} / {Math.max(totalPages, 1)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ganti Password (Requirement 10) */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        // Jangan izinkan tutup jika masih dipaksa ganti password pertama kali
        if (!open && user?.mustChangePassword) return;
        setPasswordDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {user?.mustChangePassword ? "Wajib Ganti Password" : "Ganti Password"}
            </DialogTitle>
            <DialogDescription>
              {user?.mustChangePassword
                ? "Akun Anda saat ini menggunakan password default 'intern'. Demi keamanan, Anda wajib membuat password baru sebelum melanjutkan."
                : "Masukkan password baru minimal 6 karakter."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password Baru</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Konfirmasi Password Baru</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
              />
            </div>

            {passwordError && (
              <p className="rounded-md bg-red-50 p-2.5 text-xs text-red-600">
                {passwordError}
              </p>
            )}

            {passwordSuccess && (
              <p className="rounded-md bg-green-50 p-2.5 text-xs text-green-700">
                {passwordSuccess}
              </p>
            )}

            <DialogFooter>
              {!user?.mustChangePassword && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={passwordLoading}
                >
                  Batal
                </Button>
              )}

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
