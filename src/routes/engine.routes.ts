import {Router} from "express";
import multer from "multer";
import {APIScoringController} from "../controllers/api.scoring.controller";

class EngineRoutes {
    router = Router();
    APIScoringController = new APIScoringController();
    upload = multer();

    constructor() {
        this.intializeRoutes();
    }

    intializeRoutes() {

        this.router.post("/score", this.upload.none(), this.APIScoringController.score);

    }
}

export default new EngineRoutes().router;
