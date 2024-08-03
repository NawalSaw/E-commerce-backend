import mongoose from "mongoose";
import { Opinion } from "../models/opinion.model.js";
import ApiHandler from "../utils/ApiHandler.js";

const createOpinion = ApiHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { opinion } = req.body;

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
  } else {
    await existingOpinion.updateOne({ opinion });
  }

  res
    .status(201)
    .json(new ApiResponse(201, newOpinion, "Opinion created successfully"));
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
