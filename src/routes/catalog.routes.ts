import { Router } from "express";
import { authOptional, authRequired } from "../middleware/auth";
import * as catalogController from "../controllers/catalog.controller";

const router = Router();

router.get("/games", authOptional, catalogController.search);
router.get("/games/:id", authOptional, catalogController.getById);
router.post("/games/sync-from-bgg", authRequired, catalogController.syncFromBgg);

export default router;
