import mongoose from "mongoose";
import z from "zod";

export const messageContentValidationSchema = z.object({
    body: z.strictObject({
        content: z.string().min(2).max(50000).optional(),
        receiverId: z.string().refine((data) => {
            return mongoose.Types.ObjectId.isValid(data)
        }, { message: "invalid format " })
    }),
    files: z.array(
        z.strictObject({

            fieldname: z.string(),
            originalname: z.string(),
            encoding: z.string(),
            mimetype: z.string(),
            path: z.string(),
            destination: z.string(),
            filename: z.string(),
            size: z.number()
        })
    ).max(3).optional()

}).superRefine((data, context) => {
    if (!data.body.content && !data.files?.length) {
        context.addIssue({
            code: 'custom',
            path: ['content'],
            message: "missing message content"
        })
    }
})



export const getAllMessageSchema = z.object({
    query: z.strictObject({
        type: z.enum(['0', '1', '2']).default('0'),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(5)

    }),


})

export const deleteMessageSchema = z.object({
    params: z.strictObject({
        messageId: z.string().refine((data) => { return mongoose.Types.ObjectId.isValid(data) }, { message: "invalid format" })


    }),


})