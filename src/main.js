import express from "express";
import { env } from "./config/env.service.js";
import { databaseConnection } from "./database/connection.js";
import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/user/user.controller.js";
import { globalErrorHandling } from "./common/index.js";
const app = express();
app.use(express.json());
app.use("/auth", authRouter);
app.use("/user", userRouter);

app.use(globalErrorHandling);
databaseConnection(app, env.port);
