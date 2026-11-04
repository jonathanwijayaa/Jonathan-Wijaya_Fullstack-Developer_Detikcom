import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase";

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getAdminDashboard(
  _req: Request,
  res: Response
) {
  try {
    const today = getTodayDate();

    const { count: totalInterns, error: internError } =
      await supabaseAdmin
        .from("interns")
        .select("*", { count: "exact", head: true });

    if (internError) throw internError;

    const { data: attendance, error: attendanceError } =
      await supabaseAdmin
        .from("attendances")
        .select("status")
        .eq("attendance_date", today);

    if (attendanceError) throw attendanceError;

    const present =
      attendance?.filter((item) => item.status === "PRESENT").length || 0;

    const late =
      attendance?.filter((item) => item.status === "LATE").length || 0;

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

export async function getInternDashboard(
  _req: Request,
  res: Response
) {
  try {
    const user = res.locals.user;
    const today = getTodayDate();

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

    const { data: todayAttendance, error: todayError } =
      await supabaseAdmin
        .from("attendances")
        .select("*")
        .eq("intern_id", intern.id)
        .eq("attendance_date", today)
        .maybeSingle();

    if (todayError) throw todayError;

    const { data: history, error: historyError } =
      await supabaseAdmin
        .from("attendances")
        .select("id, attendance_date, check_in, check_out, status")
        .eq("intern_id", intern.id)
        .order("attendance_date", { ascending: false })
        .limit(5);

    if (historyError) throw historyError;

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

export async function getRecentAttendance(
  _req: Request,
  res: Response
) {
  try {
    // Get latest attendance records
    const { data: attendance, error: attendanceError } =
      await supabaseAdmin
        .from("attendances")
        .select(
          "id, intern_id, attendance_date, check_in, check_out, status"
        )
        .order("attendance_date", { ascending: false })
        .order("check_in", { ascending: false })
        .limit(10);

    if (attendanceError) throw attendanceError;

    // Return empty list if no attendance records exist
    if (!attendance || attendance.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Recent attendance retrieved successfully",
        data: [],
      });
    }

    const internIds = [
      ...new Set(attendance.map((item) => item.intern_id)),
    ];

    // Get intern profiles
    const { data: interns, error: internError } =
      await supabaseAdmin
        .from("interns")
        .select("id, intern_code, user_id")
        .in("id", internIds);

    if (internError) throw internError;

    const userIds = [
      ...new Set((interns || []).map((intern) => intern.user_id)),
    ];

    // Get intern names
    const { data: users, error: userError } =
      await supabaseAdmin
        .from("users")
        .select("id, name")
        .in("id", userIds);

    if (userError) throw userError;

    // Combine attendance, intern, and user data
    const recentAttendances = attendance.map((item) => {
      const intern = interns?.find(
        (record) => record.id === item.intern_id
      );

      const user = users?.find(
        (record) => record.id === intern?.user_id
      );

      return {
        id: item.id,
        attendance_date: item.attendance_date,
        check_in: item.check_in,
        check_out: item.check_out,
        status: item.status,
        intern_name: user?.name || "Unknown",
        intern_code: intern?.intern_code || "-",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Recent attendance retrieved successfully",
      data: recentAttendances,
    });
  } catch (error) {
    console.error("Recent attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve recent attendance",
    });
  }
}