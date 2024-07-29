import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
});

export const Category = mongoose.model("Category", categorySchema);
