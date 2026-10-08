import mongoose from "mongoose";
import { env } from "../config/env.service.js";

export async function databaseConnection(app, port) {
  mongoose
    .connect(env.databaseUri)
    .then(() => {
      console.log("connected to database");
      app.listen(env.port, () => {
        console.log(`server running on port ${env.port}`);
      });
    })
    .catch((error) => {
      console.log(error);
    });
}
