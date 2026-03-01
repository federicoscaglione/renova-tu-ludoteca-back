import { Router } from "express";
import { authRequired } from "../middleware/auth";
import * as notificationsController from "../controllers/notifications.controller";

const router = Router();

router.get("/", authRequired, notificationsController.list);
router.patch("/:id/read", authRequired, notificationsController.markRead);
router.patch("/read-all", authRequired, notificationsController.markAllRead);

export default router;
