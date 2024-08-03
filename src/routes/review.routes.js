import express from "express";
import {
  addReview,
  deleteMyReview,
  updateMyReview,
} from "../controllers/review.controllers.js";
import JWTCheck from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(JWTCheck);
router.route("/:productId").post(addReview);
router.route("/:reviewId").patch(updateMyReview).delete(deleteMyReview);
router.route("/").get(updateMyReview);

export default router;
