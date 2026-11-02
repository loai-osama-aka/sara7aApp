import mongoose, { Schema, Types } from "mongoose";

const messageSchema = Schema(
  {
    content: {
      type: String,
      required: function () { return this.attachments?.length > 0 ? false : true },
      minLength: 3,
      maxLength: 50000,
    },
    attachments: {
      type: [String],
    },
    senderId: {
      type: Types.ObjectId,
      ref: 'user'
    },
    receiverId: {
      type: Types.ObjectId,
      ref: 'user',
      required: true
    }

  },
  { timestamps: true },
);
export const messageModel = mongoose.model("message", messageSchema);
