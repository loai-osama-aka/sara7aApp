import mongoose from "mongoose";
import { env } from "../config/env.service.js";
import { connectRedis } from "./redis/redis.connection.js";

export async function databaseConnection(app) {
  mongoose
    .connect(env.databaseUri)
    .then(() => {
      console.log("connected to database");
      connectRedis()

      app.listen(env.port, () => {
        console.log(`server running on port ${env.port}`);
      });
    })
    .catch((error) => {
      console.log(error);
    });
}
