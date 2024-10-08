import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const offerSchema = new mongoose.Schema({
  offerType: {
    enum: ["buyOneGetOne", "discount", "bulkDiscount"],
  },
  offerValue: { type: Number },
});

offerSchema.pre("save", async function (next) {
  if (!this.offerType === "buyOneGetOne" && this.offerValue > 0) {
    throw new ApiError(
      "discount or bulkDiscount offer should have discount value",
      400
    );
  }
  next();
});

export const Offer = mongoose.model("Offer", offerSchema);
