import { Router, type Request, type Response } from "express";
import { getAllDomains } from "../../domains/index.js";

export const domainsRouter = Router();

domainsRouter.get("/", (_req: Request, res: Response): void => {
  const domains = getAllDomains().map((d) => ({
    name: d.name,
    displayName: d.displayName,
    description: d.description,
  }));
  res.json(domains);
});
