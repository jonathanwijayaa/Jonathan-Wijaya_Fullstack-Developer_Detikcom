import { Router } from "express";
import {
  getAllAttendance,
  getAttendanceReport,
} from "./attendance.controller";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllAttendance);
router.get("/report", getAttendanceReport);

export default router;