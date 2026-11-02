import mongoose, { Schema } from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/index.js";

const userSchema = Schema(
  {
    userName: {
      type: String,
      required: true,
      min: 3,
      max: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider == providerEnum.System
      },
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      enum: genderEnum,
      default: genderEnum.Male,
    },
    role: {
      type: String,
      enum: roleEnum,
      default: roleEnum.User,
    },
    provider: {
      type: String,
      enum: providerEnum,
      default: providerEnum.System,
    },
    profileImage: {
      type: String,
    },
    convertImage: {
      type: [String],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    twoStepVerification: {
      type: Boolean,
      default: false
    },
    uniqueName: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 20,
      lowercase: true,
      match: /^[a-z0-9_]+$/,
    }
  },
  { timestamps: true },
);
export const userModel = mongoose.model("user", userSchema);
