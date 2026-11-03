
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src/common/utils/file -> server/uploads
export const uploadsDir = path.resolve(__dirname, "../../../../uploads");

await fs.mkdir(uploadsDir, { recursive: true });

const isStoredUpload = (value) =>
    typeof value === "string" &&
    (value.startsWith("/uploads/") ||
        value.startsWith("uploads/") ||
        value.startsWith("uploads\\"));

const toAbsolutePath = (value) =>
    path.join(uploadsDir, path.basename(value));

export const uploadedFileUrl = (file) =>
    `/uploads/${file.filename}`;

export const removeStoredFiles = async (storedFiles = []) => {
    const files = storedFiles
        .filter(isStoredUpload)
        .map(toAbsolutePath);

    await Promise.all(
        files.map(async (file) => {
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

export const removeUploadedFiles = async (req) => {
    const files = req.files ?? (req.file ? [req.file] : []);

    await removeStoredFiles(files.map((file) => file.path));
};
