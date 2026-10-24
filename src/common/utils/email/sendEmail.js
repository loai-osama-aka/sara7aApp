import nodemailer from "nodemailer";
import { env } from "../../../config/env.service.js";
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.sendEmail,
        pass: env.pass
    }
})


export const sendEmail = (to, subject, html) => {
    transporter.sendMail({
        from: `"sara7a@gmail.com" <${env.sendEmail}>`,
        to,
        subject,
        html
    })
}
