import {Router} from "express";
import multer from "multer";
import {APIEngineController} from "../controllers/api.engine.controller";

class EngineRoutes {
    router = Router();
    APIEngineController = new APIEngineController();
    upload = multer();

    constructor() {
        this.intializeRoutes();
    }

    intializeRoutes() {

        this.router.post("/score", this.upload.none(), this.APIEngineController.score);

    }
}

export default new EngineRoutes().router;
