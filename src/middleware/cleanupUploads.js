import { removeUploadedFiles } from "../common/utils/file/storage.js";

// express only calls an error middleware after the route failed, so this is the last chance
// to drop files multer already wrote for a request that never completed (validation, bad receiverId...)
export const cleanupUploads = async (err, req, res, next) => {
    try {
        await removeUploadedFiles(req);
    } catch (error) {
        console.log("failed to clean up uploaded files:", error.message);
    }
    next(err);
};
