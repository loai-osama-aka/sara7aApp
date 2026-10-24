import { client } from "../../database/redis/redis.connection.js";
import { sendEmail } from "../utils/email/sendEmail.js";
import { BadRequestException, ConflictException, TooManyRequestsException } from "../exceptions/error.exceptions.js";

// get
export const get = async (key) => {
    let value = await client.get(key)
    try {
        value = JSON.parse(value)

        return value

    } catch (error) {


        return value
    }
}
// set
export const set = async (key, value, ttl = undefined) => {
    console.log(key, value);

    if (typeof (value) == 'object') {
        console.log('1vadsvafa');

        value = JSON.stringify(value)
    }
    console.log('1vadsvafa1');
    return await client.set(key, value, { EX: ttl })
}
// exist
export const exists = async (key) => {

    return await client.exists(key)
}
// update
export const update = async (key, value, ttl) => {
    if (!await exists(key)) {
        return 0
    }

    return await set(key, value, ttl)
}
// del
export const del = async (key) => {

    return await client.del(key)
}
// keys
export const keys = async (prefix) => {

    return await client.keys(`${prefix}*`)
}
// ttl
export const ttl = async (key) => {

    return await client.ttl(key)
}
// expire
export const expire = async (key, expireAfter) => {

    return await client.expire(key, expireAfter)
}

export const incrBy = async (key, incrValue = 1) => {

    return await client.incrBy(key, incrValue)
}







export const emailKey = (email, subject) => {
    return `User::${email}::${subject}::OTP`
}
// key for trial attempts
export const emailTrialKey = (email, subject) => {
    return `User::${email}::${subject}::trials`
}

export const sendEmailOtp = async (email, subject, title, timeToLive = 120, maxTrial = 3, blockTime = 300) => {
    // console.log(subject);

    let existOTP_TTL = await ttl(emailKey(email, subject))
    console.log(existOTP_TTL, 'exist OTP');

    if (existOTP_TTL > 0) {
        throw ConflictException({ message: `cant generate another otp while the old one still valid please wait ${existOTP_TTL} seconds` })
    }
    let oldtrials = await get(emailTrialKey(email, subject)) ?? 0
    console.log(oldtrials);

    if (oldtrials >= maxTrial) {
        throw TooManyRequestsException({ message: "maximum otp trials reached please try again after 300 seconds" })
    }

    let otp = Math.round(Math.random() * 1000000)

    await set(emailKey(email, subject), otp, timeToLive)
    console.log(otp);
    sendEmail(email, title, `<h1>OTP ${otp}</h1>`)

    let current = await incrBy(emailTrialKey(email, subject), 1)
    console.log(current, 'current');

    if (current == maxTrial) {
        await expire(emailTrialKey(email, subject), blockTime)
    }

}

export const maxLoginAttempts = async ({ maxAttempts = 5, email, subject, blockTime = 300 } = {}) => {
    let TTL_trial = await ttl(emailTrialKey(email, subject))
    let count = await get(emailTrialKey(email, subject)) ?? 0


    count = await incrBy(emailTrialKey(email, subject), 1)
    console.log(count, 'count');
    if (count == maxAttempts) {
        await expire(emailTrialKey(email, subject), blockTime)
    }
    if (TTL_trial > 0) {
        throw TooManyRequestsException({ message: `you have reached the maximum attempts please try again after ${TTL_trial}` })
    }
    return BadRequestException({ message: "email or password is  wrong" });

}