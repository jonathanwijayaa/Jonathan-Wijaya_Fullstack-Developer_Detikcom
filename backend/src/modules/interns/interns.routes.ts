import { Router } from "express";
import {
  getAllInterns,
  createIntern,
} from "./interns.controller";
import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/", getAllInterns);
router.post("/", createIntern);

export default router;