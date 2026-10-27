import {
  BadRequestException,
  compareHash,
  ConflictException,
  generateHash,
  NotFoundException,
  providerEnum,
} from "../../common/index.js";
import {
  generateAccessToken,
  generateToken,
} from "../../common/services/token.service.js";
import { userModel } from "../../database/model/user.model.js";
import { del, emailKey, emailTrialKey, get, keys, maxLoginAttempts, sendEmailOtp, set, ttl } from "../../common/services/redis.service.js";
import { OAuth2Client } from 'google-auth-library';
import { env } from "../../config/env.service.js";


//signup api
export const signup = async (body) => {
  const { userName, email, phone, age, password, confirmPassword, gender } = body;
  console.log(body);

  let existedMail = await userModel.findOne({ email });
  if (existedMail) {
    return ConflictException({ message: "email already exist!" });
  }
  if (password !== confirmPassword) {
    return BadRequestException({
      message: "password and confirm password doesnot match",
    });
  }
  const hashedPassword = await generateHash({ plainText: password });
  // generate OTP
  const user = await userModel.create({
    userName,
    email,
    phone,
    age,
    password: hashedPassword,
    gender,

  });

  await sendEmailOtp(email, 'confirmEmail', 'Confirm email otp')

  return { message: 'user created successfully', user };
};


//request twoStepVerification
export const twoStepVerification = async (email) => {

  const user = await userModel.findOne({ email });

  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }


  await sendEmailOtp(email, 'twoStepVerify', 'Confirm two step verification')
  return { message: "otp sent to your gmail" }
}

//verifyTwoStepVerification
export const verifyTwoStepVerification = async (email, otp) => {

  const user = await userModel.findOne({ email });

  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }

  if (otp != await get(emailKey(email, 'twoStepVerify'))) {
    throw BadRequestException({ message: "wrong OTP" })
  }

  user.twoStepVerification = true
  await user.save()
  await del(emailKey(email, 'twoStepVerify'))

  return { message: 'two step verification enabled', user }
}

// login confirmation using two step verify
export const checkTwoStepOtp = async (email, otp) => {

  const user = await userModel.findOne({ email });

  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }
  if (otp != await get(emailKey(email, 'twoStepVerify'))) {
    throw BadRequestException({ message: "wrong OTP" })
  }

  let { accessToken, refreshToken } = generateToken(user);

  return { message: "login successfully", accessToken, refreshToken };

}

//login api
export const login = async (body) => {
  const { email, password } = body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }
  if (!user.isVerified) {
    throw BadRequestException({ message: "user is not verified yet" })
  }

  const isMatched = await compareHash(password, user.password);

  if (isMatched) {
    // no max attempts reached yet
    if (user.twoStepVerification) {
      await sendEmailOtp(email, 'twoStepVerify', 'Confirm two step verification')

      return { message: "please verify your email an otp sent to your gmail", }
    }
    if (await ttl(emailTrialKey(email, 'loginAttempts')) < 0) {
      await set(emailTrialKey(email, 'loginAttempts'), 0)
      const { accessToken, refreshToken } = generateToken(user);

      return { message: "login successfully", accessToken, refreshToken };
    } else {
      // after the all atttempts reached
      throw BadRequestException({ message: "you can't login now try again later" })
    }
  } else {
    await maxLoginAttempts({ email, subject: 'loginAttempts' })


  }
};

// generate new access token
export const generateNewAccessToken = async (refreshToken) => {
  let accessToken = await generateAccessToken(refreshToken);
  return { accessToken };
};





const client = new OAuth2Client();
async function verifyGoogleAccount(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientId,  // Specify the WEB_CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[WEB_CLIENT_ID_1, WEB_CLIENT_ID_2, WEB_CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  return payload
}

// signup & login using google
export const signupOrLoginWithGoogle = async (idToken) => {
  // console.log({ idToken });
  const payload = await verifyGoogleAccount(idToken)
  // console.log({ payload });

  if (!idToken) {
    // console.log('errorrrr');

    return BadRequestException({ message: "Google credential is required." })
  }

  if (payload.email_verified !== true) {
    return BadRequestException({ message: "email not verified by Google" })
  }

  const existEmail = await userModel.findOne({ email: payload.email })
  // console.log(existEmail, 'exist');

  if (existEmail) {
    //user  login using system provider so it should throw error so he login with email and password
    if (existEmail.provider == providerEnum.System) {
      return BadRequestException({ message: "you cant login using gmail please enter your email and password" })
    }
    // means the user exist and trying to login using gmail 

    const { accessToken, refreshToken } = generateToken(existEmail)
    return { message: "user created successfully", tokens: { accessToken, refreshToken }, user: existEmail }
  }

  //means user has not been created yet so it will be created and login aswell
  const user = await userModel.create({
    userName: payload.name,
    email: payload.email,
    isVerified: payload.email_verified,
    profileImage: payload.picture,
    provider: providerEnum.google
  })
  const { accessToken, refreshToken } = generateToken(user)
  return { message: "user created successfully", tokens: { accessToken, refreshToken }, user }


}


// verify account
export const verifyAccount = async (otp, email) => {
  const user = await userModel.findOne({ email })
  if (!user) {
    throw NotFoundException({ message: "no email found " })
  }
  if (user.isVerified) {
    throw BadRequestException({ message: "user already verified" })
  }
  console.log(await get(emailKey(email, 'confirmEmail')));
  console.log(otp, 'otp');

  if (otp != await get(emailKey(email, 'confirmEmail'))) {
    throw BadRequestException({ message: "wrong OTP" })
  }
  user.isVerified = true
  const getKeys = await keys(`User::${email}::confirmEmail::*`);

  await del(getKeys)


  await user.save()
  return { message: 'user verified successfully', user }
}

// reSend otp to VerifyAccount
export const reSendVerifyAccount = async (email) => {
  const user = await userModel.findOne({ email })
  if (!user) {
    throw NotFoundException({ message: "no email found " })
  }
  if (user.isVerified) {
    throw BadRequestException({ message: "user already verified" })
  }

  await sendEmailOtp(email, 'confirmEmail', 'Confirm email otp')
  return { message: "OTP sent successfully", }
}

// forgetPassword
export const forgetPassword = async (email) => {
  const user = await userModel.findOne({ email, isVerified: true })
  if (!user) {
    throw NotFoundException({ message: "no email found " })
  }

  await sendEmailOtp(email, 'forgetPassword', 'Forget password otp')
  return { message: 'OTP sent successfully' }
}

// verify forgetPassword
export const verifyForgetPassword = async (otp, email) => {
  const user = await userModel.findOne({ email })
  if (!user) {
    throw NotFoundException({ message: "no email found " })
  }
  console.log(await get(emailKey(email, 'forgetPassword')), 'ottttp');

  if (otp !== await get(emailKey(email, 'forgetPassword'))) {
    throw BadRequestException({ message: "wrong OTP" })
  }

  return { message: 'user verified successfully', user }
}

// reset forgetPassword
export const resetForgetPassword = async (otp, email, password) => {
  const { user } = await verifyForgetPassword(otp, email)
  if (await compareHash(password, user.password)) {
    throw ConflictException({ message: "enter a new password you entered the same old password" })
  }
  user.password = await generateHash({ plainText: password })
  await user.save()
  const keys = keys(`User::${email}::forgetPassword::*`);
  del(keys)
  return { message: "password changed successfully" }
}

