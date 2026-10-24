import { BadRequestException } from "../common/index.js"

export const validation = (schema) => {
    return (req, res, next) => {
        // console.log(req.query);

        const validationResult = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        })

        // console.log(req.validation);
        if (!validationResult.success) {
            throw BadRequestException({ message: 'validation error', extra: validationResult.error.issues })
        }
        req.validation = validationResult.data

        next()
    }
}
