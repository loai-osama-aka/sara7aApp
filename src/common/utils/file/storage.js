import fs from "node:fs/promises";
import path from "node:path";

// multer writes into ./uploads (relative to the cwd) and main.js serves the same folder
export const uploadsDir = path.resolve("./uploads");

const isStoredUpload = (value) =>
    typeof value === "string" &&
    (value.startsWith("/uploads/") || value.startsWith("uploads/") || value.startsWith("uploads\\"));

// "/uploads/x.png", "uploads\\x.png" and "x.png" all resolve to <uploadsDir>/x.png.
// taking the last segment makes sure a crafted value can never escape the uploads folder
const toAbsolutePath = (value) => path.join(uploadsDir, value.split(/[\\/]/).pop());

// the value we store in the database: forward slashes only, so the url works on every client
export const uploadedFileUrl = (file) => `/uploads/${file.filename}`;

export const removeStoredFiles = async (storedFiles = []) => {
    const files = storedFiles.filter(isStoredUpload).map(toAbsolutePath);

    await Promise.all(
        files.map(async (file) => {
            if (!file.startsWith(uploadsDir + path.sep)) {
                return;
            }
            try {
                await fs.unlink(file);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    console.log(`failed to delete ${file}:`, error.message);
                }
            }
        })
    );
};

// used on the error path: multer already wrote the files before the request failed
export const removeUploadedFiles = async (req) => {
    const files = req.files ?? (req.file ? [req.file] : []);

    await removeStoredFiles(files.map((file) => file.path));
};
