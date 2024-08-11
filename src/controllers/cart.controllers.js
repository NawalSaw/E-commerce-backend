import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import ApiHandler from "../utils/ApiHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Product } from "../models/product.model.js";

export const addToCart = ApiHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, "product is required");
  }

  const cart = await Cart.findOne({ owner: req.user._id }).watch({
    fullDocument: "updateLookup",
  });

  if (!cart) {
    const newCart = await Cart.create({
      owner: req.user._id,
      products: [
        {
          product: productId,
          quantity: 1,
        },
      ],
    });

    const productData = await newCart.products.map(async (product) => {
      const productData = await Product.findById(product.product);
      return productData;
    });

    const dataToSend = newCart.products.map((product) => {
      return {
        _id: product.product,
        name: productData.name,
        price: productData.price,
        image: productData.image,
        quantity: product.quantity,
      };
    });

    if (!newCart) {
      throw new ApiError(500, "Something went wrong");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, dataToSend, "Cart created"));
  } else {
    const productIndex = cart.products.findIndex(
      (product) => product.product.toString() === productId
    );
    if (productIndex > -1) {
      cart.products[productIndex].quantity += 1;
      await cart.save();

      const productData = await cart.products.map(async (product) => {
        const productData = await Product.findById(product.product);
        return productData;
      });

      const dataToSend = cart.products.map((product) => {
        return {
          _id: product.product,
          name: productData.name,
          price: productData.price,
          image: productData.image,
          quantity: product.quantity,
        };
      });
      return res
        .status(200)
        .json(new ApiResponse(200, dataToSend, "Product added to cart"));
    } else {
      cart.products.push({ product: productId, quantity: 1 });
      await cart.save();

      const productData = await cart.products.map(async (product) => {
        const productData = await Product.findById(product.product);
        return productData;
      });
      const dataToSend = cart.products.map((product) => {
        return {
          _id: product.product,
          name: productData.name,
          price: productData.price,
          image: productData.image,
          quantity: product.quantity,
        };
      });

      return res
        .status(200)
        .json(new ApiResponse(200, dataToSend, "Product added to cart"));
    }
  }
});
export const removeFromCart = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, "product is required");
  }

  const cart = await Cart.findOne({ owner: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const productIndex = cart.products.findIndex(
    (product) => product.product.toString() === productId
  );

  if (productIndex > -1) {
    cart.products.splice(productIndex, 1);
    await cart.save();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Product removed from cart"));
  } else {
    throw new ApiError(404, "Product not found in cart");
  }
});
export const clearCart = ApiHandler(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { owner: req.user._id },
    { $set: { products: [] } },
    {
      new: true,
    }
  );

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Cart cleared successfully"));
});
export const updateQuantityOfProduct = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(400, "product is required");
  }

  const cart = await Cart.findOneAndUpdate(
    { owner: req.user._id },
    { $set: { "products.$[product].quantity": quantity } },
    { new: true, arrayFilters: [{ "product.product": productId }] }
  );

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Quantity updated successfully"));
});
