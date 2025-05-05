import {Request, Response, NextFunction} from "express";
import {compute} from "../utils/spectral";
import {APIError} from "../utils/api.error";
import {Score} from "../models/score";

export class APIScoringController {

    async score(req: Request, res: Response, next: NextFunction) {

        const content: string = req.body.content;
        if (!content) {
            console.warn("No specifications provided");
            next(new APIError(400, "No specifications provided", "Please include the API specification as the request body."));
        } else {
            const issues: string = req.body.issues;
           try {
                const outcome: Score = await compute(content);
                let count = 0;
                for (let index = 0; index < outcome.categories.length; index++) {
                    count += outcome.categories[index].issues.length;
                    console.log("API score computed for category and specification [🚀]", "title", outcome.title, "category", outcome.categories[index].category , "score", outcome.categories[index].score, "issues", outcome.categories[index].issues.length);
                    if (issues == "false") {
                        outcome.categories[index].issues = [];
                    }
                }
                console.log("API score computed for specification 🚀", "title", outcome.title, "size", content.length, "score", outcome.score, "issues", count);

                res.status(200).json(outcome);
            } catch (err: any) {
                console.error(err);
                next(new APIError(500, "Fail to compute the score", "An unexpected error occurred."));
            }
        }
    }

}
