
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  Search,
  X,
  Download
} from "lucide-react";

import api from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AttendanceRecord {
  id: string;
  intern_id: string;
  intern_name: string;
  email: string;
  intern_code: string;
  department: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: "PRESENT" | "LATE" | "ABSENT";
}

interface Summary {
  totalInterns: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(time: string | null) {
  if (!time) return "-";

  return new Date(time)
    .toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(":", ".");
}

function getStatusBadge(status: AttendanceRecord["status"]) {
  switch (status) {
    case "PRESENT":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Present
        </Badge>
      );
    case "LATE":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          Late
        </Badge>
      );
    default:
      return <Badge variant="destructive">Absent</Badge>;
  }
}

export default function AttendanceReport() {
  const defaultRange = getCurrentMonthRange();

  const [startDate, setStartDate] = useState(
    defaultRange.startDate
  );
  const [endDate, setEndDate] = useState(
    defaultRange.endDate
  );

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [summary, setSummary] = useState<Summary>({
    totalInterns: 0,
    present: 0,
    late: 0,
    absent: 0,
    attendanceRate: 0,
  });

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchAttendance(page = 1) {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/attendance/report", {
        params: {
          start_date: startDate,
          end_date: endDate,
          search,
          department: department === "ALL" ? "" : department,
          status: status === "ALL" ? "" : status,
          page,
        },
      });

      const result = response.data;

      setRecords(result.data ?? []);
      setSummary(result.summary);
      setPagination(result.pagination);
      setDepartments(result.filters?.departments ?? []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ??
          "Failed to load attendance report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      fetchAttendance(1);
    }
  }, [startDate, endDate, search, department, status]);

  const summaryCards = [
    {
      title: "Total Intern",
      value: summary.totalInterns,
      description: "Active during selected period",
      icon: Users,
    },
    {
      title: "Present",
      value: summary.present,
      description: "On-time attendance",
      icon: CheckCircle2,
    },
    {
      title: "Late",
      value: summary.late,
      description: "Late attendance",
      icon: Clock,
    },
    {
      title: "Absent",
      value: summary.absent,
      description: "Missed working days",
      icon: UserX,
    },
    {
      title: "Attendance Rate",
      value: `${summary.attendanceRate}%`,
      description: "Present + Late / Expected days",
      icon: TrendingUp,
    },
  ];

  const [downloading, setDownloading] = useState(false);

async function downloadPDF() {
  try {
    setDownloading(true);

    const params = {
      start_date: startDate,
      end_date: endDate,
      search,
      department: department === "ALL" ? "" : department,
      status: status === "ALL" ? "" : status,
    };

    // Ambil seluruh halaman hasil filter
    const firstResponse = await api.get(
      "/admin/attendance/report",
      { params: { ...params, page: 1 } }
    );

    let allRecords: AttendanceRecord[] =
      firstResponse.data.data ?? [];

    const totalPages = Math.max(
      firstResponse.data.pagination?.totalPages ?? 1,
      1
    );

    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      const response = await api.get(
        "/admin/attendance/report",
        { params: { ...params, page: currentPage } }
      );

      allRecords = [
        ...allRecords,
        ...(response.data.data ?? []),
      ];
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 18);

    doc.setFontSize(10);
    doc.text(
      `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`,
      14,
      26
    );

    doc.text(
      `Department: ${department === "ALL" ? "All Departments" : department}`,
      14,
      32
    );

    doc.text(
      `Status: ${status === "ALL" ? "All Status" : status}`,
      14,
      38
    );

    doc.text(
      `Search: ${search.trim() || "All Interns"}`,
      14,
      44
    );

    autoTable(doc, {
      startY: 51,
      head: [[
        "No.",
        "Intern Name",
        "Intern Code",
        "Department",
        "Date",
        "Check In",
        "Check Out",
        "Status",
      ]],
      body: allRecords.map((record, index) => [
        index + 1,
        record.intern_name,
        record.intern_code,
        record.department,
        formatDate(record.attendance_date),
        formatTime(record.check_in),
        formatTime(record.check_out),
        record.status,
      ]),
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    const safeDate = new Date().toISOString().slice(0, 10);

    doc.save(`attendance-report-${safeDate}.pdf`);
  } catch (err) {
    console.error("Failed to download attendance report:", err);
    setError("Failed to generate PDF. Please try again.");
  } finally {
    setDownloading(false);
  }
}

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </p>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>

                <p className="mt-3 text-2xl font-bold">
                  {item.value}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Report Filters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Search Intern
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name or intern code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Department
              </label>
              <Select
                value={department}
                onValueChange={setDepartment}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="ALL">
                    All Departments
                  </SelectItem>
                  {departments.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status
              </label>
              <Select
                value={status}
                onValueChange={setStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    All Status
                  </SelectItem>
                  <SelectItem value="PRESENT">
                    Present
                  </SelectItem>
                  <SelectItem value="LATE">
                    Late
                  </SelectItem>
                  <SelectItem value="ABSENT">
                    Absent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearch("");
                setDepartment("ALL");
                setStatus("ALL");
              }}
              title="Clear filters"
              aria-label="Clear filters"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">
            Attendance Records
          </h2>
          <p className="text-sm text-muted-foreground">
            Attendance details based on selected filters
          </p>
        </div>

        <Button
          onClick={downloadPDF}
          disabled={downloading || loading || pagination.total === 0}
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

          {error && (
            <p className="px-5 pb-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intern</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Loading attendance records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">
                          {record.intern_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.intern_code}
                        </div>
                      </TableCell>

                      <TableCell>
                        {record.department}
                      </TableCell>

                      <TableCell>
                        {formatDate(record.attendance_date)}
                      </TableCell>

                      <TableCell>
                        {record.check_in
                          ? new Date(record.check_in).toLocaleTimeString("id-ID", {
                              timeZone: "Asia/Jakarta",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {record.check_out
                          ? new Date(record.check_out).toLocaleTimeString("id-ID", {
                              timeZone: "Asia/Jakarta",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              {pagination.total === 0
                ? "Showing 0 of 0 records"
                : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )} of ${pagination.total} records`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchAttendance(pagination.page - 1)}
              >
                Previous
              </Button>

              <span className="px-2 text-sm font-medium">
                {pagination.page} / {Math.max(pagination.totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() => fetchAttendance(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
