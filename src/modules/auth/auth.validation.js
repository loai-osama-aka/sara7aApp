import { email, z } from 'zod'

export const loginSchema = z.object({
    email: z.email({ message: "invalid email formate please add valid format  like exmaple@any.com" }),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/)
})

export const loginValidation = z.object({
    body: loginSchema,
    query: z.object({
        lang: z.enum(['ar', 'en']).default('ar')
    }),
})

export const signupSchema = z.object({
    body: loginSchema.extend({
        confirmPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/),
        userName: z.string().min(2, { message: "minimum username length is 2 char" }),
        phone: z.e164(),
        age: z.number(),
        gender: z.enum(['0', '1'], { message: "enter 0 for male or 1 for female" })
    }).refine((data) => {
        return data.password === data.confirmPassword

    }, { message: 'password mismatch with confirm password' }),
})

export const confirmEmailSchema = z.object({
    body: z.object({
        email: z.email({ message: "invalid email formate please add valid format  like exmaple@any.com" }),
        otp: z.string().regex(/[\d]{5,6}/).optional()
    })
})

export const resetForgetPasswordSchema = z.object({
    body: z.strictObject({
        email: z.email({ message: "invalid email formate please add valid format  like exmaple@any.com" }),
        otp: z.string().regex(/[\d]{5,6}/),
        password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/),
        confirmPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/)

    }).refine((data) => {
        return data.password == data.confirmPassword
    }, { message: 'password mismatch with confirm password' })
})