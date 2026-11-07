import mongoose from "mongoose";
import z from "zod";
import { StatusEnum } from "../../common/index.js";


export const messageContentValidationSchema = z.object({
    body: z.strictObject({
        content: z.string().min(2).max(50000).optional(),
        // either the receiver's _id or their uniqueName (share link) is enough
        receiverId: z.string().refine((data) => {
            return mongoose.Types.ObjectId.isValid(data)
        }, { message: "invalid format " }).optional(),
        uniqueName: z.string()
            .min(3, { message: "uniqueName must be at least 3 characters" })
            .max(20, { message: "uniqueName must be at most 20 characters" })
            .regex(/^[a-z0-9_]+$/i, { message: "invalid uniqueName" })
            .optional(),
        isAnonymous: z.preprocess((value) => {
            // console.log(value);

            if (value === "true") return true;
            if (value === "false") return false;
            return value;
        }, z.boolean().default(true))
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
    if (!data.body.receiverId && !data.body.uniqueName) {
        context.addIssue({
            code: 'custom',
            path: ['receiverId'],
            message: "receiverId or uniqueName is required"
        })
    }
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


export const respondToIdentityRequestSchema = z.object({
    params: z.object({
        messageId: z.string().length(24)
    }),
    body: z.object({
        status: z.coerce.number().refine(
            (value) => [
                StatusEnum.Accepted,
                StatusEnum.Rejected
            ].includes(value),
            {
                message: "Status must be Accepted or Rejected"
            }
        )
    })
});


export const getConversationMessagesSchema = z.object({
    params: z.object({
        conversationId: z.string().length(24)
    }),
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20)
    })
});