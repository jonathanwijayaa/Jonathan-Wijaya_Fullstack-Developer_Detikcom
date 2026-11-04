import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { AuthUser } from "../../middlewares/auth.middleware";

function getAttendanceDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getInternId(user: AuthUser) {
  const { data, error } = await supabaseAdmin
    .from("interns")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// POST /api/attendance/check-in
export async function checkIn(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const now = new Date();

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .insert({
        intern_id: internId,
        attendance_date: getAttendanceDate(),
        check_in: now.toISOString(),
        status: "PRESENT",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "You have already checked in today",
        });
      }

      console.error("Check-in error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check in",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// POST /api/attendance/check-out
export async function checkOut(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const attendanceDate = getAttendanceDate();

    const { data: attendance, error: findError } = await supabaseAdmin
      .from("attendances")
      .select("id, check_in, check_out")
      .eq("intern_id", internId)
      .eq("attendance_date", attendanceDate)
      .maybeSingle();

    if (findError) {
      console.error("Find attendance error:", findError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance",
      });
    }

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: "You must check in before checking out",
      });
    }

    if (attendance.check_out) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("attendances")
      .update({
        check_out: new Date().toISOString(),
      })
      .eq("id", attendance.id)
      .is("check_out", null)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Check-out error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to check out",
      });
    }

    if (!data) {
      return res.status(409).json({
        success: false,
        message: "You have already checked out today",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data,
    });
  } catch (error) {
    console.error("Check-out error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET /api/attendance/me
export async function getMyAttendance(req: Request, res: Response) {
  try {
    const user = res.locals.user as AuthUser;
    const internId = await getInternId(user);

    if (!internId) {
      return res.status(404).json({
        success: false,
        message: "Intern profile not found",
      });
    }

    const today = getAttendanceDate();

    // Get today's attendance
    const { data: todayAttendance, error: todayError } =
      await supabaseAdmin
        .from("attendances")
        .select("*")
        .eq("intern_id", internId)
        .eq("attendance_date", today)
        .maybeSingle();

    if (todayError) {
      console.error("Today's attendance error:", todayError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve today's attendance",
      });
    }

    // Get attendance history
    const { data: history, error: historyError } =
      await supabaseAdmin
        .from("attendances")
        .select("*")
        .eq("intern_id", internId)
        .order("attendance_date", { ascending: false })
        .limit(30);

    if (historyError) {
      console.error("Attendance history error:", historyError);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance history",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance retrieved successfully",
      data: {
        today: todayAttendance,
        history: history || [],
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getAllAttendance(
  req: Request,
  res: Response
) {
  try {
    const { date, status, intern_id } = req.query;

    let query = supabaseAdmin
      .from("attendances")
      .select(`
        id,
        attendance_date,
        check_in,
        check_out,
        status,
        created_at,
        interns (
          id,
          intern_code,
          department,
          users (
            name,
            email
          )
        )
      `)
      .order("attendance_date", { ascending: false })
      .order("check_in", { ascending: false });

    // Filter by attendance date
    if (typeof date === "string") {
      query = query.eq("attendance_date", date);
    }

    // Filter by attendance status
    if (typeof status === "string") {
      if (!["PRESENT", "LATE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
      }

      query = query.eq("status", status);
    }

    // Filter by intern ID
    if (typeof intern_id === "string") {
      query = query.eq("intern_id", intern_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get all attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance reports",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance reports retrieved successfully",
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Get all attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}