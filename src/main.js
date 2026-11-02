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
