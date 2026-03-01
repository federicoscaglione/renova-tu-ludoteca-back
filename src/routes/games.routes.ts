import { Router } from "express";
import { authOptional, authRequired } from "../middleware/auth";
import { uploadGameImages } from "../middleware/upload";
import * as gamesController from "../controllers/games.controller";

const router = Router();

router.get("/", authOptional, gamesController.list);
router.get("/:id", authOptional, gamesController.get);
router.post("/", authRequired, gamesController.create);
router.put("/:id", authRequired, gamesController.update);
router.delete("/:id", authRequired, gamesController.remove);
router.post("/:id/images", authRequired, uploadGameImages, gamesController.uploadImages);

export default router;
