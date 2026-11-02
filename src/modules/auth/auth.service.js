import {
  BadRequestException,
  compareHash,
  ConflictException,
  generateHash,
  NotFoundException,
  providerEnum,
} from "../../common/index.js";
import {
  createRevokeToken,
  generateAccessToken,
  generateToken,
} from "../../common/services/token.service.js";
import { userModel } from "../../database/model/user.model.js";
import { del, emailTrialKey, keys, maxLoginAttempts, sendEmailOtp, ttl, verifyOtp } from "../../common/services/redis.service.js";
import { OAuth2Client } from 'google-auth-library';
import { env } from "../../config/env.service.js";


//signup api
export const signup = async (body) => {
  const { userName, email, phone, age, password, confirmPassword, gender, uniqueName } = body;
  // console.log(body);
  const slug = uniqueName.trim().toLowerCase()
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
    uniqueName: slug

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

  await verifyOtp({ email, subject: 'twoStepVerify', otp })

  user.twoStepVerification = true
  await user.save()
  const getKeys = await keys(`User::${email}::twoStepVerify::*`);
  await del(getKeys)


  return { message: 'two step verification enabled', user }
}

// login confirmation using two step verify
export const checkTwoStepOtp = async (email, otp) => {

  const user = await userModel.findOne({ email });

  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }
  await verifyOtp({ email, subject: 'twoStepVerify', otp })

  let { accessToken, refreshToken } = generateToken(user);

  const getKeys = await keys(`User::${email}::twoStepVerify::*`);
  await del(getKeys)


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
  if (user.provider == '1') {
    throw BadRequestException({ message: "this user logged in with google please sign in with google" })
  }
  const isMatched = await compareHash(password, user.password);

  if (isMatched) {
    // no max attempts reached yet
    if (await ttl(emailTrialKey(email, 'loginAttempts')) < 0) {
      await del(emailTrialKey(email, 'loginAttempts'))
      if (user.twoStepVerification) {
        await sendEmailOtp(email, 'twoStepVerify', 'Confirm two step verification')

        return { message: "please verify your email an otp sent to your gmail", }
      }
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

  return await generateAccessToken(refreshToken);


};

// generate new access token
export const logout = async (payload) => {
  return await createRevokeToken(payload)
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
  if (!idToken) {
    // console.log('errorrrr');

    return BadRequestException({ message: "Google credential is required." })
  }
  // console.log({ idToken });
  const payload = await verifyGoogleAccount(idToken)
  // console.log({ payload });


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


  const base = (payload.given_name || payload.name?.split(" ")[0] || "user")
    .toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  let uniqueName = base;
  let tries = 0;
  while (await userModel.exists({ uniqueName })) {
    uniqueName = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    tries++; if (tries > 10) break;
  }

  //means user has not been created yet so it will be created and login aswell
  const user = await userModel.create({
    userName: payload.name,
    email: payload.email,
    isVerified: payload.email_verified,
    profileImage: payload.picture,
    provider: providerEnum.google,
    uniqueName
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
  await verifyOtp({ email, subject: 'confirmEmail', otp })
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
  const user = await userModel.findOne({ email, isVerified: true, provider: providerEnum.System })
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
  await verifyOtp({ email, subject: 'forgetPassword', otp })

  return { message: 'user verified successfully', user }
}

// reset forgetPassword
export const resetForgetPassword = async (otp, email, password) => {
  const { user } = await verifyForgetPassword(otp, email)

  // google accounts have no password, bcrypt would throw on an undefined hash
  if (user.provider == providerEnum.google) {
    throw BadRequestException({ message: "this account signs in with google, so it has no password to reset" })
  }

  if (await compareHash(password, user.password)) {
    throw ConflictException({ message: "enter a new password you entered the same old password" })
  }
  user.password = await generateHash({ plainText: password })
  await user.save()
  const getKeys = await keys(`User::${email}::forgetPassword::*`);
  await del(getKeys)
  return { message: "password changed successfully" }
}

