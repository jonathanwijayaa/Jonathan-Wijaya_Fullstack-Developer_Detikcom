import { Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase";

const createInternSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  intern_code: z.string().min(2).max(30),
  department: z.string().min(2).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (data) => !data.end_date || data.end_date >= data.start_date,
  {
    message: "End date must be after or equal to start date",
    path: ["end_date"],
  }
);

// GET /api/admin/interns
export async function getAllInterns(
  _req: Request,
  res: Response
) {
  try {
    const { data, error } = await supabaseAdmin
      .from("interns")
      .select(`
        id,
        user_id,
        intern_code,
        department,
        start_date,
        end_date,
        created_at,
        users (
          name,
          email,
          role
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get interns error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve interns",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Interns retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("Get interns error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// POST /api/admin/interns
export async function createIntern(
  req: Request,
  res: Response
) {
  const validation = createInternSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const {
    name,
    email,
    password,
    intern_code,
    department,
    start_date,
    end_date,
  } = validation.data;

  let authUserId: string | null = null;
  let profileCreated = false;

  try {
    // 1. Create Supabase Auth account
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("Create auth user error:", authError);

      return res.status(400).json({
        success: false,
        message: authError?.message || "Failed to create user account",
      });
    }

    authUserId = authData.user.id;

    // 2. Create public.users profile
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUserId,
        name,
        email,
        role: "INTERN",
      });

    if (profileError) {
      console.error("Create profile error:", profileError);

      // Rollback Auth account
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      authUserId = null;

      return res.status(400).json({
        success: false,
        message: "Failed to create intern profile",
      });
    }

    profileCreated = true;

    // 3. Create intern details
    const { data: intern, error: internError } =
      await supabaseAdmin
        .from("interns")
        .insert({
          user_id: authUserId,
          intern_code,
          department,
          start_date,
          end_date: end_date || null,
        })
        .select()
        .single();

    if (internError) {
      console.error("Create intern details error:", internError);

      // Rollback profile and Auth account
      await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", authUserId);

      await supabaseAdmin.auth.admin.deleteUser(authUserId);

      authUserId = null;
      profileCreated = false;

      return res.status(400).json({
        success: false,
        message: "Failed to create intern details",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Intern created successfully",
      data: {
        intern,
        user: {
          id: authUserId,
          name,
          email,
          role: "INTERN",
        },
      },
    });
  } catch (error) {
    console.error("Create intern error:", error);

    // Cleanup if an unexpected error occurs
    if (authUserId) {
      if (profileCreated) {
        await supabaseAdmin
          .from("users")
          .delete()
          .eq("id", authUserId);
      }

      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}