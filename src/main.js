import express from "express";
import { databaseConnection } from "./database/connection.js";
import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/user/user.controller.js";
import messageRouter from "./modules/messages/message.controller.js";
import { globalErrorHandling } from "./common/index.js";
import { cleanupUploads } from "./middleware/cleanupUploads.js";
// import { pathToFileURL } from 'url'
// import path from "path";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// root route, so the host's health check gets a 200 instead of a 404
app.get("/", (req, res) => {
  res.status(200).json({ message: "sara7a api is running", status: 200 });
});

// dedicated health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/message", messageRouter);


// const __fileName = pathToFileURL(import.meta.url)
// // console.log(__fileName.pathname);
// const __dirName = path.resolve(__fileName.pathname)
// console.log(__dirName);

// const imagePath
app.use('/uploads', express.static('./uploads'))

app.use(cleanupUploads);
app.use(globalErrorHandling);
databaseConnection(app);
