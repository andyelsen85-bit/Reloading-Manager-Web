import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import healthRouter from "./health";
import cartridgesRouter from "./cartridges";
import bulletsRouter from "./bullets";
import powdersRouter from "./powders";
import primersRouter from "./primers";
import loadsRouter from "./loads";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import authRouter from "./auth";
import usersRouter from "./users";
import referenceRouter from "./reference";
import chargeLaddersRouter from "./charge_ladders";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);

router.use(requireAuth as any);

router.use(referenceRouter);
router.use(chargeLaddersRouter);
router.use(cartridgesRouter);
router.use(bulletsRouter);
router.use(powdersRouter);
router.use(primersRouter);
router.use(loadsRouter);
router.use(dashboardRouter);

router.use(requireAdmin as any);

router.use(usersRouter);
router.use(settingsRouter);

export default router;
