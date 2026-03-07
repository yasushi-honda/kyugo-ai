import { Router, Request, Response } from "express";
import * as supportMenuRepo from "../repositories/support-menu-repository.js";

export const supportMenusRouter = Router();

// GET /api/support-menus - 支援メニュー一覧
supportMenusRouter.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category ? String(req.query.category) : undefined;
    const menus = await supportMenuRepo.listSupportMenus(category);
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/support-menus/:id - 支援メニュー詳細
supportMenusRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const menu = await supportMenuRepo.getSupportMenu(id);
    if (!menu) {
      res.status(404).json({ error: "Support menu not found" });
      return;
    }
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
