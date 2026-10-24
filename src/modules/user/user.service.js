import { BadRequestException } from "../../common/index.js";
import { userModel } from "../../database/model/user.model.js";

// getUserById
export const getUserById = async (id) => {
  const user = await userModel.findById(id);
  // console.log(user, "user from user.controller");
  if (!user) {
    throw BadRequestException({ message: "Invalid account Id" });
  }
  return user;
};
