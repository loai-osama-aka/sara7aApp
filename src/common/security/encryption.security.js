import { env } from "../../config/env.service.js";
import bcrypt from "bcrypt";

export const generateHash = async ({ plainText, salt = env.saltRounds }) => {
  const hashedPassword = await bcrypt.hash(plainText, Number(salt));
  return hashedPassword;
};
export const compareHash = async (plainText, hashedPassword) => {
  const isMatched = await bcrypt.compare(plainText, hashedPassword);
  return isMatched;
};
