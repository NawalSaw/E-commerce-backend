import mongoose from "mongoose";

const variationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  variation: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  previews: {
    type: [String],
  },
});

export const Variation = mongoose.model("Variation", variationSchema);
