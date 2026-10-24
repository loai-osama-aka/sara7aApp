import {
  BadRequestException,
  compareHash,
  ConflictException,
  generateHash,
  NotFoundException,
} from "../../common/index.js";
import {
  generateAccessToken,
  generateToken,
} from "../../common/services/token.service.js";
import { userModel } from "../../database/model/user.model.js";
import { del, emailKey, emailTrialKey, get, keys, maxLoginAttempts, sendEmailOtp, set, ttl } from "../../common/services/redis.service.js";


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
  if (user.twoStepVerification) {
    await sendEmailOtp(email, 'twoStepVerify', 'Confirm two step verification')

    return { message: "please verify your email an otp sent to your gmail", }
  }
  const isMatched = await compareHash(password, user.password);

  if (isMatched) {
    // no max attempts reached yet
    if (await ttl(emailTrialKey(email, 'loginAttempts')) < 0) {
      await set(emailTrialKey(email, 'loginAttempts'), 0)
      let { accessToken, refreshToken } = generateToken(user);

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

//get all users
export const getAllUsers = async () => {
  const users = await userModel.find()
  return { users }
}