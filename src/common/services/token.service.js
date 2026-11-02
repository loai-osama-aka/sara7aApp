import jwt from "jsonwebtoken";
import { env } from "../../config/env.service.js";
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  UnauthorizedException,
} from "../exceptions/error.exceptions.js";
import { exists, revokeTokenKey, set } from "./redis.service.js";

export const generateToken = (user) => {
  let jwtid = randomUUID()
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
    jwtid
  });

  const refreshToken = jwt.sign({}, refreshSignature, {
    subject: user.id,
    // noTimestamp: true,
    expiresIn: env.refresh_token_expiresIN,
    audience: aud,
    jwtid
  });
  //   console.log({ accessToken, refreshToken }, "from token.serivece");
  return { accessToken, refreshToken };
};

export const createRevokeToken = async (payload) => {
  const refreshExpiresAt = payload.iat + env.refresh_token_expiresIN;
  const ttl = refreshExpiresAt - Math.floor(Date.now() / 1000);

  if (ttl > 0) {
    await set(revokeTokenKey(payload.sub, payload.jti), payload.jti, ttl);
  }
};


// generate new access token
export const generateAccessToken = async (refreshToken) => {
  const decode = jwt.decode(refreshToken);
  if (!decode) {
    throw BadRequestException({ message: "invalid token" });
  }
  // let accessExpiresAtMs = (decode.iat + env.access_token_expiresIN) * 1000
  // if (Date.now() < accessExpiresAtMs) {
  //   return BadRequestException({ message: "Access token still valid" })
  // }



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

    const isRevoked = await exists(
      revokeTokenKey(decodeRefreshToken.sub, decodeRefreshToken.jti)
    );

    if (isRevoked) {
      throw BadRequestException({ message: "refresh token has been revoked" });
    }


    const jwtid = randomUUID();

    const newAcessToken = jwt.sign({}, signature, {
      expiresIn: env.access_token_expiresIN,
      audience: aud,
      subject: decodeRefreshToken.sub,
      jwtid
    });
    const newRefreshToken = jwt.sign({}, refreshSignature, {
      subject: decodeRefreshToken.sub,
      audience: aud,
      expiresIn: env.refresh_token_expiresIN,
      jwtid
    });


    await createRevokeToken(decodeRefreshToken)



    return { accessToken: newAcessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw BadRequestException({ message: "invalid token" });
  }
};
