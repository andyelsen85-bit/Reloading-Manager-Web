import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cartridgesRouter from "./cartridges";
import bulletsRouter from "./bullets";
import powdersRouter from "./powders";
import primersRouter from "./primers";
import loadsRouter from "./loads";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cartridgesRouter);
router.use(bulletsRouter);
router.use(powdersRouter);
router.use(primersRouter);
router.use(loadsRouter);
router.use(dashboardRouter);

export default router;
