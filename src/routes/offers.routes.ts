import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import * as offersController from "../controllers/offers.controller.js";

const router = Router();

router.get("/", authRequired, offersController.list);
router.get("/:id", authRequired, offersController.get);
router.post("/", authRequired, offersController.create);
router.put("/:id", authRequired, offersController.update);
router.delete("/:id", authRequired, offersController.remove);

export default router;
