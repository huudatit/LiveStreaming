import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide valid email"],
      trim: true,
    },
    hashedPassword: {
      type: String,
      required: true,
      minlength: 6,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: String,
    bio: String,
    streamKey: {
      type: String,
      unique: true,
      required: true,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    totalViews: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);