import multer from "multer";
import { randomUUID } from 'crypto'


export const fileValidation = {
    image: ["image/jpeg", 'image/png', 'image/jpg', 'image/gif'],
    file: ['application/pdf', 'application/json']
}

export const upload = ({ maxSize = 5, validation = [] } = {}) => {

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, './uploads')
        },
        filename: (req, file, cb) => {
            // console.log(file, 'mime');

            cb(null, `${randomUUID()}_${file.originalname}`)
        }
    })

    const fileFilter = (req, file, cb) => {

        if (!validation.includes(file.mimetype)) {
            return cb(new Error("invalid type", false))
        }
        cb(null, true)

    }

    return multer({ fileFilter, storage, limits: { fileSize: maxSize * 1024 * 1024 } })
}

