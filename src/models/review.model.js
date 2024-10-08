import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  rating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
  },
});

export const Review = mongoose.model("Review", reviewSchema);
