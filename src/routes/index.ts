import {Application, NextFunction, Request, Response} from "express";
import engineRoutes from "./engine.routes";
import {APIError} from "../utils/api.error";

export default class Routes {

    constructor(app: Application) {

        app.use("/engine", engineRoutes);

        app.use((req: Request, res: Response, next: NextFunction) => {
            next(new APIError(404, "Not Found", `URL ${req.method} ${req.originalUrl}`));
        });

        app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            if (!(err instanceof APIError)) {
                err = new APIError(
                    err.status || 500,
                    err.title || "Internal Server Error",
                    err.message || "An unexpected error occurred.",
                    err.type || "about:blank"
                );
            }
            res.status(err.status).json({
                type: err.type,
                title: err.title,
                status: err.status,
                detail: err.detail,
                instance: req.originalUrl,
            });
        });
        
    }
}
