import mongoose from "mongoose";
import Wishlist from "../models/wishlist.model.js";
import ApiHandler from "../utils/ApiHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";

const addProductToWishlist = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { userId } = req.user;

  if (
    !mongoose.isValidObjectId(productId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, "Invalid product id or user id");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const wishlist = await Wishlist.findOne({ user: userId });
  if (wishlist) {
    const isProductAdded = wishlist.products.some(
      (product) => product.product.toString() === productId
    );
    if (!isProductAdded) {
      wishlist.products.push({ product: productId });
      await wishlist.save();
    }
  } else {
    const newWishlist = await Wishlist.create({
      user: userId,
      products: [{ product: productId }],
    });
  }

  res.status(200).json(new ApiResponse(200, "Product added to wishlist", null));
});

const removeProductFromWishlist = ApiHandler(async (req, res) => {
  const { productId } = req.body;
  const { userId } = req.user;

  if (
    !mongoose.isValidObjectId(productId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    throw new ApiError(400, "Invalid product id or user id");
  }

  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  const isProductAdded = wishlist.products.some(
    (product) => product.product.toString() === productId
  );
  if (!isProductAdded) {
    throw new ApiError(404, "Product not found in wishlist");
  }

  wishlist.products = wishlist.products.filter(
    (product) => product.product.toString() !== productId
  );

  await wishlist.save();

  res
    .status(200)
    .json(new ApiResponse(200, "Product removed from wishlist", null));
});

const clearWishlist = ApiHandler(async (req, res) => {
  const { userId } = req.user;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "User id is required");
  }

  const wishlist = await Wishlist.findOneAndDelete({ user: userId });
  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  res.status(200).json(new ApiResponse(200, "Wishlist cleared", null));
});

export { addProductToWishlist, removeProductFromWishlist, clearWishlist };
