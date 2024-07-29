import express from "express";
import rateLimit from "express-rate-limit";
import {
  signupUser,
  verifyOTP,
  reSendOTP,
  loginUser,
} from "../controllers/user.controllers.js";

const apiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // Limit each IP to 10 requests per `window` (here, per 30 minutes)
  message: "Too many requests from this IP, please try again after 30 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
});

const router = express.Router();

router.route("/register").post(signupUser);
router.route("/verify-otp").post(apiLimiter, verifyOTP);
router.route("/resend-otp").post(apiLimiter, reSendOTP);
router.route("/login").post(loginUser);

export default router;
