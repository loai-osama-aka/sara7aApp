import mongoose, { Schema, Types } from "mongoose";

const conversationMessageSchema = Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "conversation",
      required: true,
    },

    senderId: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      required: function () {
        return !this.attachments?.length;
      },
    },

    attachments: {
      type: [String],
      default: [],
      validate: {
        validator: (files) => files.length <= 3,
        message: "Maximum 3 images are allowed",
      },
    },
  },
  { timestamps: true }
);

conversationMessageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

export const conversationMessageModel = mongoose.model("conversationMessage", conversationMessageSchema);