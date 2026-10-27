import jwt from "jsonwebtoken";
import { env } from "../../config/env.service.js";
import {
  BadRequestException,
  UnauthorizedException,
} from "../exceptions/error.exceptions.js";

export const generateToken = (user) => {
  let accessSignature;
  let aud;
  let refreshSignature;
  switch (user.role) {
    case "1":
      accessSignature = env.adminAcessTokenSignature;
      aud = "admin";
      refreshSignature = env.admin_refresh_token_signature;

      break;

    default:
      accessSignature = env.userAccessTokenSignature;
      aud = "user";
      refreshSignature = env.user_refresh_token_signature;

      break;
  }

  const accessToken = jwt.sign({}, accessSignature, {
    subject: user.id,
    // noTimestamp: true,
    expiresIn: env.access_token_expiresIN,
    audience: aud,
  });

  const refreshToken = jwt.sign({}, refreshSignature, {
    subject: user.id,
    // noTimestamp: true,
    expiresIn: env.refresh_token_expiresIN,
    audience: aud,
  });
  //   console.log({ accessToken, refreshToken }, "from token.serivece");
  return { accessToken, refreshToken };
};

// generate new access token
export const generateAccessToken = async (refreshToken) => {
  const decode = jwt.decode(refreshToken);
  let signature;
  let refreshSignature;
  let aud;
  switch (decode.aud) {
    case "admin":
      signature = env.adminAcessTokenSignature;
      refreshSignature = env.admin_refresh_token_signature;
      aud = "admin";

      break;

    default:
      signature = env.userAccessTokenSignature;
      refreshSignature = env.user_refresh_token_signature;
      aud = "user";

      break;
  }
  try {
    const decodeRefreshToken = jwt.verify(refreshToken, refreshSignature);
    console.log(decodeRefreshToken);

    const newAcessToken = jwt.sign({}, signature, {
      expiresIn: env.access_token_expiresIN,
      audience: aud,
      subject: decodeRefreshToken.sub,
    });
    return newAcessToken;
  } catch (error) {
    throw BadRequestException({ message: "invalid token" });
  }
};
