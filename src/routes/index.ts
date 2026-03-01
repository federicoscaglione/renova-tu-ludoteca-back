import { Router, Request, Response } from "express";
import catalogRoutes from "./catalog.routes";
import gamesRoutes from "./games.routes";
import offersRoutes from "./offers.routes";
import meetupsRoutes from "./meetups.routes";
import usersRoutes from "./users.routes";
import locationsRoutes from "./locations.routes";
import { health } from "./health";

const router = Router();

router.get("/health", health);

router.use("/catalog", catalogRoutes);
router.use("/games", gamesRoutes);
router.use("/offers", offersRoutes);
router.use("/meetups", meetupsRoutes);
router.use("/locations", locationsRoutes);
router.use("/", usersRoutes);

export default router;
