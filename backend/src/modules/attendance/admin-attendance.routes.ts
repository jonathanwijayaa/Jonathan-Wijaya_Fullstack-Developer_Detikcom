import { Router } from "express";
import { getAllAttendance } from "./attendance.controller";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllAttendance);

export default router;