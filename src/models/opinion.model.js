import mongoose from "mongoose";

const opinionSchema = new mongoose.Schema({
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
    required: true,
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  opinion: { type: String, enum: ["helpful", "report"], required: true },
});

export const Opinion = mongoose.model("Opinion", opinionSchema);
