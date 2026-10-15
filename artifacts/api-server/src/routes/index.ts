import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rentalRouter from "./rental";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rentalRouter);

export default router;
