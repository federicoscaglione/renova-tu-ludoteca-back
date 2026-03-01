import { Router } from "express";
import { authOptional, authRequired } from "../middleware/auth.js";
import * as meetupsController from "../controllers/meetups.controller.js";

const router = Router();

router.get("/", authOptional, meetupsController.list);
router.get("/:id", authOptional, meetupsController.get);
router.post("/", authRequired, meetupsController.create);
router.put("/:id", authRequired, meetupsController.update);
router.delete("/:id", authRequired, meetupsController.remove);
router.post("/:id/participants", authRequired, meetupsController.join);
router.delete("/:id/participants", authRequired, meetupsController.leave);

export default router;
