import express, {Application} from "express";
import Server from "./index";

const app: Application = express();
const server: Server = new Server(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app
    .listen(PORT, "0.0.0.0", function () {
        console.log(`API Scoring service is running on port ${PORT}.`);
        console.log(`❤️ Made with love and [API]ness`);
    })
    .on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
            console.log("Error: address already in use");
        } else {
            console.log(err);
        }
    });

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at", promise, "reason", reason);
});
