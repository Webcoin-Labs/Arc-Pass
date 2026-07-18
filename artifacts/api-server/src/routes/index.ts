import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eligibilityRouter from "./eligibility";
import passesRouter from "./passes";
import usersRouter from "./users";
import adminRouter from "./admin";
import sharingRouter from "./sharing";
import adminAuthRouter from "./admin-auth";
import networkRouter from "./network";
import founderApplicationsRouter from "./founder-applications";
import supportRouter from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(networkRouter);
router.use(founderApplicationsRouter);
router.use(supportRouter);
router.use(authRouter);
router.use(eligibilityRouter);
router.use(passesRouter);
router.use(usersRouter);
router.use(adminAuthRouter);
router.use(adminRouter);
router.use(sharingRouter);

export default router;
