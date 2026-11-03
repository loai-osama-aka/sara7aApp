import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { databaseConnection } from "./database/connection.js";
import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/user/user.controller.js";
import messageRouter from "./modules/messages/message.controller.js";
import { globalErrorHandling } from "./common/index.js";
import { cleanupUploads } from "./middleware/cleanupUploads.js";
// import { pathToFileURL } from 'url'
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../uploads')
// the built React app, copied here by `npm run build:web`
const publicDir = path.resolve(__dirname, "../public");
const indexFile = path.join(publicDir, "index.html");
const hasWebApp = fs.existsSync(indexFile);
// api paths must never fall back to index.html
const apiPrefixes = ["/auth", "/user", "/message", "/uploads", "/health"];
const app = express();
app.use(cors());
app.use(express.json());

// root route: the web app when it is built, otherwise a health payload
app.get("/", (req, res) => {
  if (hasWebApp) return res.sendFile(indexFile);
  res.status(200).json({ message: "sara7a api is running", status: 200 });
});

// dedicated health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/message", messageRouter);
app.use('/uploads', express.static(uploadsDir))

// const __fileName = pathToFileURL(import.meta.url)
// // console.log(__fileName.pathname);
// const __dirName = path.resolve(__fileName.pathname)
// console.log(__dirName);
// const imagePath


if (hasWebApp) {
  app.use(express.static(publicDir, { index: false }));

  // public share links look like /<uniqueName>, so every non-api GET renders the app
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const isApi = apiPrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
    );
    if (isApi) return next();

    res.sendFile(indexFile, (error) => (error ? next(error) : undefined));
  });
}

app.use(cleanupUploads);
app.use(globalErrorHandling);
databaseConnection(app);
