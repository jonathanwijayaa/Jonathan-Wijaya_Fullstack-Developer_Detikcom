import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import internsRoutes from "./modules/interns/interns.routes";
import adminAttendanceRoutes from "./modules/attendance/admin-attendance.routes";
import { supabaseAdmin } from "./config/supabase";
import {
  authenticate,
  authorize,
} from "./middlewares/auth.middleware";

const app = express();
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

app.use("/api/admin/interns", internsRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/admin/attendance", adminAttendanceRoutes);

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

app.get(
  "/api/admin/dashboard",
  authenticate,
  authorize("ADMIN"),
  async (_req, res) => {
    try {
      const today = getTodayDate();

      // Total interns
      const { count: totalInterns, error: internError } =
        await supabaseAdmin
          .from("interns")
          .select("*", { count: "exact", head: true });

      if (internError) {
        throw internError;
      }

      // Today's attendance records
      const { data: attendance, error: attendanceError } =
        await supabaseAdmin
          .from("attendances")
          .select("status")
          .eq("attendance_date", today);

      if (attendanceError) {
        throw attendanceError;
      }

      const present = attendance?.filter(
        (item) => item.status === "PRESENT"
      ).length || 0;

      const late = attendance?.filter(
        (item) => item.status === "LATE"
      ).length || 0;

      const totalAttendance = attendance?.length || 0;

      return res.status(200).json({
        success: true,
        message: "Admin dashboard retrieved successfully",
        data: {
          totalInterns: totalInterns || 0,
          today: {
            totalAttendance,
            present,
            late,
            notCheckedIn: Math.max(
              0,
              (totalInterns || 0) - totalAttendance
            ),
          },
        },
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve admin dashboard",
      });
    }
  }
);

app.get(
  "/api/intern/dashboard",
  authenticate,
  authorize("INTERN"),
  async (_req, res) => {
    try {
      const user = res.locals.user;
      const today = getTodayDate();

      // Find intern profile
      const { data: intern, error: internError } =
        await supabaseAdmin
          .from("interns")
          .select("id, intern_code, department, start_date, end_date")
          .eq("user_id", user.id)
          .single();

      if (internError || !intern) {
        return res.status(404).json({
          success: false,
          message: "Intern profile not found",
        });
      }

      // Today's attendance
      const { data: todayAttendance, error: todayError } =
        await supabaseAdmin
          .from("attendances")
          .select("*")
          .eq("intern_id", intern.id)
          .eq("attendance_date", today)
          .maybeSingle();

      if (todayError) {
        throw todayError;
      }

      // Recent attendance history
      const { data: history, error: historyError } =
        await supabaseAdmin
          .from("attendances")
          .select("id, attendance_date, check_in, check_out, status")
          .eq("intern_id", intern.id)
          .order("attendance_date", { ascending: false })
          .limit(5);

      if (historyError) {
        throw historyError;
      }

      return res.status(200).json({
        success: true,
        message: "Intern dashboard retrieved successfully",
        data: {
          profile: {
            ...user,
            intern_code: intern.intern_code,
            department: intern.department,
            start_date: intern.start_date,
            end_date: intern.end_date,
          },
          today: todayAttendance,
          history: history || [],
        },
      });
    } catch (error) {
      console.error("Intern dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve intern dashboard",
      });
    }
  }
);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Attendance API is running!",
  });
});

export default app;