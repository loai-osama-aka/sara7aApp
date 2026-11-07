// import jwt from "jsonwebtoken";
// import { env } from "../config/env.service.js";
import { UnauthorizedException, BadRequestException } from "../common/index.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.service.js";
import { exists, revokeTokenKey } from "../common/services/redis.service.js";

// export const auth = (req, res, next) => {
//   // console.log(req.headers.token, "token");
//   const { authorization } = req.headers;
//   console.log(authorization);

//   if (!authorization) {
//     throw UnauthorizedException({ message: "unauthorized  Account" });
//   }
//   try {
//     let payload = jwt.verify(authorization, env.access_token_signature);

//     console.log(payload, "payload");
//     req.user = payload;

//     next();
//   } catch (error) {
//     throw UnauthorizedException({ message: "Invalid or expired token" });
//   }
// };

export const auth = async (req, res, next) => {
  // console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    throw UnauthorizedException({ message: "no token found" })
  }
  const [flag, token] = req.headers.authorization.split(" ");
  // console.log(flag, "||", token);
  switch (flag) {
    case "Bearer":
      const payload = jwt.decode(token);
      if (!payload) {
        throw BadRequestException({ message: "Invalid token format" })
      }
      // console.log(await exists(revokeTokenKey(payload.sub, payload.jti)), 'ls');

      if (await exists(revokeTokenKey(payload.sub, payload.jti))) {
        throw UnauthorizedException({ message: "Expired login credentials" })
      }
      let signature;
      switch (payload.aud) {
        case "admin":
          signature = env.adminAcessTokenSignature;
          break;

        default:
          signature = env.userAccessTokenSignature;
          break;
      }
      try {
        const decoded = jwt.verify(token, signature);
        console.log(decoded, 'decoded');
        req.user = decoded;
      } catch (error) {
        throw UnauthorizedException({ message: "Invalid token" });
      }

      break;

    default:
      throw UnauthorizedException({ message: "Invalid authorization scheme" });
      break;
  }

  next();
};
