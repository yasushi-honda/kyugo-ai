import type { AuthUser, Case } from "./types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      caseData?: Case;
    }
  }
}
