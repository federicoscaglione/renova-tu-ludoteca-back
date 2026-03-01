import { Router, Request, Response } from "express";
import gamesRoutes from "./games.routes.js";
import offersRoutes from "./offers.routes.js";
import meetupsRoutes from "./meetups.routes.js";
import usersRoutes from "./users.routes.js";
import { health } from "./health.js";

const router = Router();

router.get("/health", health);

router.use("/games", gamesRoutes);
router.use("/offers", offersRoutes);
router.use("/meetups", meetupsRoutes);
router.use("/", usersRoutes);

export default router;
