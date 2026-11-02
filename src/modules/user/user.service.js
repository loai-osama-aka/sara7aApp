import { BadRequestException, NotFoundException } from "../../common/index.js";
import { userModel } from "../../database/model/user.model.js";
import { removeStoredFiles, uploadedFileUrl } from "../../common/utils/file/storage.js";

// getUserById
export const getUserById = async (id) => {
  const user = await userModel.findById(id);
  // console.log(user, "user from user.controller");
  if (!user) {
    throw BadRequestException({ message: "Invalid account Id" });
  }
  return user;
};


// public lookup used by share links (`/<uniqueName>`).
// Only returns what an anonymous sender needs, never the full account.
export const getPublicUserByUniqueName = async (uniqueName) => {
  const slug = String(uniqueName ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(slug)) {
    throw BadRequestException({ message: "invalid uniqueName" });
  }

  const user = await userModel
    .findOne({ uniqueName: slug })
    .select("userName uniqueName profileImage");

  if (!user) {
    throw NotFoundException({ message: "no account uses that uniqueName" });
  }

  return user;
};

//get all users
export const getAllUsers = async () => {
  const users = await userModel.find()
  return { users }
}

// upload profile image for the logged in user
export const uploadProfileImage = async ({ file, user } = {}) => {
  if (!file) {
    throw BadRequestException({ message: "please attach an image in the field 'image'" })
  }

  const profileImage = uploadedFileUrl(file)

  // returns the document as it was before the update, so the previous local image can be removed
  const oldUser = await userModel.findByIdAndUpdate(user.sub, { profileImage })
  if (!oldUser) {
    throw NotFoundException({ message: "user not found" })
  }

  // only local files are ours to delete, a google profile image is an external url
  if (oldUser.profileImage?.startsWith('/uploads/')) {
    await removeStoredFiles([oldUser.profileImage])
  }

  return { message: "profile image updated successfully", profileImage }
}