import mongoose from "mongoose";
import ApiHandler from "../utils/ApiHandler.js";
import { Shop } from "../models/shop.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

const getAllMyProducts = ApiHandler(async (req, res) => {
  const products = await Shop.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(req.user._id)),
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "products",
        foreignField: "_id",
        as: "products",
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, products, "Products found"));
});

const getMyShopOrders = ApiHandler(async (req, res) => {
  const shop = await Shop.findOne({ owner: req.user._id });
  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  const shopProduct = await Product.find({ shop: shop._id });
  if (!shopProduct) {
    throw new ApiError(404, "Products not found");
  }

  const orders = await Order.find({ products: { $in: shopProduct } });

  res.status(200).json(new ApiResponse(200, orders, "Orders found"));
});

export { getAllMyProducts, getMyShopOrders };
