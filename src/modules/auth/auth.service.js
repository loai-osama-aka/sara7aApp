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
import { env } from "../../config/env.service.js";
import { userModel } from "../../database/model/user.model.js";
import jwt from "jsonwebtoken";
//signup api
export const signup = async (body) => {
  const { userName, email, phone, age, password, confirmPassword, gender } =
    body;
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
  const user = await userModel.create({
    userName,
    email,
    phone,
    age,
    password: hashedPassword,
    gender,
  });
  return user;
};

//login api
export const login = async (body) => {
  const { email, password } = body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return NotFoundException({ message: "user does not exist" });
  }
  const isMatched = await compareHash(password, user.password);

  if (isMatched) {
    let { accessToken, refreshToken } = generateToken(user);

    return { message: "login successfully", accessToken, refreshToken };
  }
  return BadRequestException({ message: "email or password is  wrong" });
};

// generate new access token
export const generateNewAccessToken = async (refreshToken) => {
  let accessToken = await generateAccessToken(refreshToken);
  return { accessToken };
};
