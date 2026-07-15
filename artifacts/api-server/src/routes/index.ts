import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eligibilityRouter from "./eligibility";
import passesRouter from "./passes";
import usersRouter from "./users";
import adminRouter from "./admin";
import sharingRouter from "./sharing";
import webhooksRouter from "./webhooks";
import adminAuthRouter from "./admin-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eligibilityRouter);
router.use(passesRouter);
router.use(usersRouter);
router.use(adminAuthRouter);
router.use(adminRouter);
router.use(sharingRouter);
router.use(webhooksRouter);

export default router;
