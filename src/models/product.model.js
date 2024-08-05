import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

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
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Detail",
  },
  avgRating: {
    type: Number,
    default: 5,
  },
});

productSchema.plugin(mongooseAggregatePaginate);

productSchema.index({ name: "text", description: "text" });

export const Product = mongoose.model("Product", productSchema);
