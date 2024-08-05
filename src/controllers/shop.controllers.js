import mongoose from "mongoose";
import { Shop } from "../models/shop.model.js";
import ApiHandler from "../utils/ApiHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const createShop = ApiHandler(async (req, res) => {
  const { name, localAddress, pincode, city, state, country } = req.body;
  if (!name || !localAddress || !pincode || !city || !state || !country) {
    throw new ApiError(400, "All fields are required");
  }

  const existingShop = await Shop.findOne({ owner: req.user._id });

  if (existingShop) {
    throw new ApiError(400, "Shop already exists");
  }

  const newShop = await Shop.create({
    name,
    owner: req.user._id,
    address: {
      localAddress,
      pincode,
      city,
      state,
      country,
    },
  });

  if (!newShop) {
    throw new ApiError(404, "error while creating shop");
  }

  res
    .status(201)
    .json(new ApiResponse(201, newShop, "Shop created successfully"));
});
const getShopById = ApiHandler(async (req, res) => {
  const { shopId } = req.params;

  if (!shopId) {
    throw new ApiError(400, "shopId is required");
  }

  const shop = await Shop.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(shopId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!shop || shop.length === 0) {
    throw new ApiError(404, "Shop not found");
  }

  res.status(200).json(new ApiResponse(200, shop, "Shop found successfully"));
});
const getMyShop = ApiHandler(async (req, res) => {
  const shop = await Shop.aggregate([
    { $match: { owner: req.user._id } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!shop || shop.length === 0) {
    throw new ApiError(404, "Shop not found or you have'nt created any shop");
  }

  res.status(200).json(new ApiResponse(200, shop, "Shop found successfully"));
});
const updateMyShop = ApiHandler(async (req, res) => {
  const { name, localAddress, pincode, city, state, country } = req.body;

  if (!name && !localAddress && !pincode && !city && !state && !country) {
    throw new ApiError(400, "At least one field is required");
  }

  const shop = await Shop.findOne({ owner: req.user._id });
  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  if (name) {
    shop.name = name;
  }
  if (localAddress) {
    shop.address.localAddress = localAddress;
  }
  if (pincode) {
    shop.address.pincode = pincode;
  }
  if (city) {
    shop.address.city = city;
  }
  if (state) {
    shop.address.state = state;
  }
  if (country) {
    shop.address.country = country;
  }
  await shop.save();

  res.status(200).json(new ApiResponse(200, shop, "Shop updated successfully"));
});
const deleteShop = ApiHandler(async (req, res) => {
  const deletedShop = await Shop.findOneAndDelete({ owner: req.user._id });

  if (!deletedShop) {
    throw new ApiError(404, "error while deleting shop");
  }

  res.status(200).json(new ApiResponse(200, null, "Shop deleted successfully"));
});

export { createShop, getShopById, getMyShop, updateMyShop, deleteShop };
