export function successResponse({ res, message = true, data = undefined, status = 200 } = {}) {
    return res.status(status).json({ message, status, data })

}