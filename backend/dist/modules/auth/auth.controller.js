"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const zod_1 = require("zod");
const supabase_1 = require("../../config/supabase");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
async function login(req, res) {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid email or password format",
        });
    }
    const { email, password } = validation.data;
    const { data, error } = await supabase_1.supabaseAuth.auth.signInWithPassword({
        email,
        password,
    });
    if (error || !data.session) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }
    // Ambil role dan profil dari database
    const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
        .from("users")
        .select("id, name, email, role")
        .eq("id", data.user.id)
        .single();
    if (profileError || !profile) {
        return res.status(403).json({
            success: false,
            message: "User profile has not been configured",
        });
    }
    return res.status(200).json({
        message: "Login successful",
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
        user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
        },
    });
}
//# sourceMappingURL=auth.controller.js.map