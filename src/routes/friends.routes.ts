import { Router } from "express";
import { authRequired } from "../middleware/auth";
import * as friendsController from "../controllers/friends.controller";

const router = Router();

router.post("/requests", authRequired, friendsController.createRequest);
router.get("/requests", authRequired, friendsController.listRequests);
router.get("/", authRequired, friendsController.listFriends);
router.post("/requests/:id/accept", authRequired, friendsController.acceptRequest);
router.post("/requests/:id/reject", authRequired, friendsController.rejectRequest);
router.delete("/:userId", authRequired, friendsController.removeFriend);

export default router;
