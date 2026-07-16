import { Router, type IRouter } from "express";
import { getArcGasPrice } from "../lib/blockscout-gas";

const router: IRouter = Router();

router.get("/network/gas-price", async (_req, res) => {
  try {
    const gasPrice = await getArcGasPrice();
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
    res.json(gasPrice);
  } catch {
    res.status(503).json({ error: "Arc gas price is temporarily unavailable." });
  }
});

export default router;
