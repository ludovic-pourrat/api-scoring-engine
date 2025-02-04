import {Request, Response, NextFunction} from "express";
import {computeAPIScore} from "../utils/spectral";
import {APIError} from "../utils/api.error";

export class APIScoringController {

    async score(req: Request, res: Response, next: NextFunction) {

        const content: string = req.body.content;
        if (!content) {
            console.warn("No specifications provided");
            next(new APIError(400, "No specifications provided", "Please include the API specification as the request body."));
        } else {
            const name: string = req.body.name;
           try {
                const outcome = await computeAPIScore(content);
                let count = 0;
                for (let index = 0; index < outcome.categories.length; index++) {
                    count += outcome.categories[index].issues.length;
                    console.log("API score computed for category and specification [🚀]", "name", name, "category", outcome.categories[index].category , "score", outcome.categories[index].score, "issues", outcome.categories[index].issues.length);
                }
                console.log("API score computed for specification 🚀", "name", name, "size", content.length, "score", outcome.score, "issues", count);
                res.status(200).json(outcome);
            } catch (err: any) {
                console.error(err);
                next(new APIError(500, "Fail to compute the score", "An unexpected error occurred."));
            }
        }
    }

}
