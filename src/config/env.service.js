import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(`./.env.${process.env.NODE_ENV}`) });

const port = process.env.PORT;
const saltRounds = process.env.SALT_ROUNDS;
const databaseUri = process.env.DATABASE_URI;
const mood = process.env.MOOD;

// access token
const userAccessTokenSignature = process.env.USER_ACCESS_TOKEN_SIGNATURE;
const adminAcessTokenSignature = process.env.ADMIN_ACCESS_TOKEN_SIGNATURE;
const access_token_expiresIN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN);

// refresh token
const user_refresh_token_signature = process.env.USER_REFRESH_TOKEN_SIGNATURE;
const admin_refresh_token_signature = process.env.ADMIN_REFRESH_TOKEN_SIGNATURE;
const refresh_token_expiresIN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN);

export const env = {
  port,
  databaseUri,
  saltRounds,
  mood,
  userAccessTokenSignature,
  adminAcessTokenSignature,
  access_token_expiresIN,
  user_refresh_token_signature,
  admin_refresh_token_signature,
  refresh_token_expiresIN,
};
