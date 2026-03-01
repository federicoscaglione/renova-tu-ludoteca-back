import { Router } from "express";
import { authRequired } from "../middleware/auth";
import * as usersController from "../controllers/users.controller";

const router = Router();

router.post("/register", usersController.register);
router.get("/me", authRequired, usersController.me);
router.patch("/me", authRequired, usersController.updateMe);
router.get("/invitations/validate", usersController.inviteValidate);
router.post("/invitations", authRequired, usersController.inviteCreate);
router.get("/invitations", authRequired, usersController.inviteList);

export default router;
