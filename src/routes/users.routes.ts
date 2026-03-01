import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import * as usersController from "../controllers/users.controller.js";

const router = Router();

router.post("/register", usersController.register);
router.get("/me", authRequired, usersController.me);
router.get("/invitations/validate", usersController.inviteValidate);
router.post("/invitations", authRequired, usersController.inviteCreate);
router.get("/invitations", authRequired, usersController.inviteList);

export default router;
