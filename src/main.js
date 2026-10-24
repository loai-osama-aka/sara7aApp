import express from "express";
import { databaseConnection } from "./database/connection.js";
import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/user/user.controller.js";
import { globalErrorHandling } from "./common/index.js";
import { pathToFileURL } from 'url'
import path from "path";
const app = express();
app.use(express.json());
app.use("/auth", authRouter);
app.use("/user", userRouter);
// const __fileName = pathToFileURL(import.meta.url)
// // console.log(__fileName.pathname);
// const __dirName = path.resolve(__fileName.pathname)
// console.log(__dirName);

// const imagePath
app.use('/uploads', express.static('./uploads'))

app.use(globalErrorHandling);
databaseConnection(app);
