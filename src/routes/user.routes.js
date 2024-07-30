import express from "express";
import rateLimit from "express-rate-limit";
import JWTCheck from "./../middlewares/auth.middleware.js";
import { upload } from "./../middlewares/multer.middleware.js";
import {
  signupUser,
  verifyOTP,
  reSendOTP,
  loginUser,
  resetPassword,
  getUser,
  logOutUser,
  updateUserAvatar,
  updateUserPassword,
  createUserAddress,
  removeUserAddress,
  updateUserDetails,
  getProductInUserCart,
  getUserWishList,
  getUserOrders,
  refreshAccessToken,
} from "../controllers/user.controllers.js";

const apiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 8, // Limit each IP to 10 requests per `window` (here, per 30 minutes)
  message: "Too many requests from this IP, please try again after 30 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
});

const router = express.Router();

router.route("/current-user").get(JWTCheck, getUser);
router.route("/get-cart").get(JWTCheck, getProductInUserCart);
router.route("/get-wishlist").get(JWTCheck, getUserWishList);
router.route("/get-order").get(JWTCheck, getUserOrders);

router.route("/register").post(signupUser);
router.route("/login").post(loginUser);
router.route("/verify-otp").post(apiLimiter, verifyOTP);
router.route("/resend-otp").post(apiLimiter, reSendOTP);
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/logout").post(JWTCheck, logOutUser);

router.route("/reset-password").patch(JWTCheck, apiLimiter, resetPassword);
router
  .route("/update-avatar")
  .patch(JWTCheck, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-password")
  .patch(JWTCheck, apiLimiter, updateUserPassword);
router.route("/create-address").patch(JWTCheck, createUserAddress);
router.route("/remove-address").patch(JWTCheck, removeUserAddress);
router.route("/update-account").patch(JWTCheck, apiLimiter, updateUserDetails);

export default router;
