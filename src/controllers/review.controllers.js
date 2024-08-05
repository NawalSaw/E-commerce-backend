import mongoose from "mongoose";
import { Review } from "../models/review.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiHandler from "../utils/ApiHandler.js";
import { ApiError } from "../utils/ApiError.js";

const addReview = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, content } = req.body;

  if (!rating || !content) {
    throw new ApiError(400, "All fields are required");
  }

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, "Invalid product id");
  }

  const review = await Review.create({
    owner: req.user._id,
    product: productId,
    rating,
    content,
  });

  if (!review) {
    throw new ApiError(500, "Something went wrong");
  }

  res
    .status(201)
    .json(new ApiResponse(201, review, "Review created successfully"));
});
const getMyReviews = ApiHandler(async (req, res) => {
  const reviews = await Review.find({ owner: req.user._id })
    .populate("product")
    .select("-owner");
  res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews found successfully"));
});
const updateMyReview = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, content } = req.body;

  if (!rating || !content) {
    throw new ApiError(400, "All fields are required");
  }

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new ApiError(400, "Invalid review id");
  }

  const review = await Review.findOneAndUpdate(
    { _id: reviewId, owner: req.user._id },
    { rating, content },
    { new: true }
  );

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, review, "Review updated successfully"));
});
const deleteMyReview = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new ApiError(400, "Invalid review id");
  }

  const review = await Review.findOneAndDelete({
    _id: reviewId,
    owner: req.user._id,
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Review deleted successfully"));
});

export { addReview, getMyReviews, updateMyReview, deleteMyReview };
