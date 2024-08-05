import mongoose from "mongoose";
import { Opinion } from "../models/opinion.model.js";
import ApiHandler from "../utils/ApiHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const createOpinion = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { opinion } = req.body;

  if (!opinion) {
    throw new ApiError(400, "All fields are required");
  }

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new ApiError(400, "Invalid review id");
  }

  const existingOpinion = await Opinion.findOne({
    review: reviewId,
    owner: req.user._id,
  });

  if (!existingOpinion) {
    const newOpinion = await Opinion.create({
      review: reviewId,
      owner: req.user._id,
      opinion,
    });

    if (!newOpinion) {
      throw new ApiError(500, "Something went wrong");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, newOpinion, "Opinion created successfully"));
  } else {
    await existingOpinion.updateOne({ opinion });

    return res
      .status(200)
      .json(
        new ApiResponse(200, existingOpinion, "Opinion updated successfully")
      );
  }
});

const removeOpinion = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new ApiError(400, "Invalid review id");
  }

  const deletedOpinion = await Opinion.findOneAndDelete({
    review: reviewId,
    owner: req.user._id,
  });

  if (!deletedOpinion) {
    throw new ApiError(404, "Opinion not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Opinion deleted successfully"));
});

const getHelpfulOpinions = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.isValidObjectId(reviewId)) {
    throw new ApiError(400, "Invalid review id");
  }

  const opinions = await Opinion.find({
    review: reviewId,
    opinion: "helpful",
  });

  res
    .status(200)
    .json(new ApiResponse(200, opinions, "Opinions found successfully"));
});

export { createOpinion, removeOpinion, getHelpfulOpinions };
