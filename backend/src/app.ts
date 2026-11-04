import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
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

app.use("/api/auth", authRoutes);

app.use("/api/attendance", attendanceRoutes);

app.get(
  "/api/admin/dashboard",
  authenticate,
  authorize("ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Welcome to Admin Dashboard",
      user: res.locals.user,
    });
  }
);

app.get(
  "/api/intern/dashboard",
  authenticate,
  authorize("INTERN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Welcome to Intern Dashboard",
      user: res.locals.user,
    });
  }
);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Attendance API is running!",
  });
});

export default app;