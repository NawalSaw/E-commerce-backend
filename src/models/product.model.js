import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  inStock: {
    type: Boolean,
    required: true,
  },
  deliveryPrice: {
    type: String,
    required: true,
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Offer",
  },
  previews: [String],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  variation: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variation",
    },
  ],
  description: {
    type: String,
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
  },
  details: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Detail",
  },
});

export const Product = mongoose.model("Product", productSchema);
