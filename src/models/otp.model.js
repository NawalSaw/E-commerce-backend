import mongoose from "mongoose";

// Define OTP Schema with TTL index
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "3m",
  }, // OTP expires in 3 minutes
});

export const Otp = mongoose.model("Otp", otpSchema);
