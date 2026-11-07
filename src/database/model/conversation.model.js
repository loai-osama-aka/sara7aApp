import mongoose, { Schema, Types } from "mongoose";

const conversationSchema = Schema(
  {
    participants: {
      type: [
        {
          type: Types.ObjectId,
          ref: 'user',
          required: true,
        },
      ],
      validate: {
        validator: (value) =>
          value.length === 2 &&
          new Set(value.map(id => id.toString())).size === 2,
        message: 'A conversation must have exactly two unique participants',
      },
    },

    originalMessageId: {
      type: Types.ObjectId,
      ref: 'message',
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

export const conversationModel = mongoose.model(
  "conversation",
  conversationSchema
);