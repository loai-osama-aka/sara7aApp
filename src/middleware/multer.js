import multer from "multer";
import { randomUUID } from 'crypto'
import path from "node:path";
import { fileURLToPath } from 'node:url'
import { uploadsDir } from "../common/utils/file/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url))


export const fileValidation = {
    image: ["image/jpeg", 'image/png', 'image/jpg', 'image/gif'],
    file: ['application/pdf', 'application/json']
}

export const upload = ({ maxSize = 5, validation = [] } = {}) => {

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadsDir)
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase()
            cb(null, `${randomUUID()}${ext}`)   // uuid + safe extension only
        }
    })

    const fileFilter = (req, file, cb) => {

        if (!validation.includes(file.mimetype)) {
            // tag it as a client error, otherwise the global error handler answers 500
            const error = new Error(`invalid file type, allowed types: ${validation.join(', ')}`)
            error.cause = { status: 400 }
            return cb(error)
        }
        cb(null, true)

    }

    const instance = multer({ fileFilter, storage, limits: { fileSize: maxSize * 1024 * 1024 } })

    // multer errors (file too large, too many files, unexpected field...) carry no status,
    // so we turn them into 400s instead of letting the global error handler report them as 500
    const handleError = (error, { fieldName, maxCount } = {}) => {
        if (!(error instanceof multer.MulterError)) {
            return error
        }

        const messages = {
            LIMIT_FILE_SIZE: `file size must not exceed ${maxSize} MB`,
            LIMIT_UNEXPECTED_FILE: maxCount > 1
                ? `field "${fieldName}" accepts at most ${maxCount} files`
                : `unexpected file field "${error.field ?? fieldName}"`,
            LIMIT_FILE_COUNT: maxCount ? `at most ${maxCount} files are allowed` : 'too many files',
        }

        error.message = messages[error.code] ?? error.message
        error.cause = { status: 400, extra: { code: error.code } }
        return error
    }

    const withStatus = (middleware, limits) => (req, res, next) => {
        middleware(req, res, (error) => {
            if (!error) {
                return next()
            }
            next(handleError(error, limits))
        })
    }

    return {
        single: (fieldName) => withStatus(instance.single(fieldName), { fieldName, maxCount: 1 }),
        array: (fieldName, maxCount) => withStatus(instance.array(fieldName, maxCount), { fieldName, maxCount }),
        any: () => withStatus(instance.any()),
        fields: (fields) => withStatus(instance.fields(fields)),
        none: () => withStatus(instance.none(), { maxCount: 0 }),
    }
}
