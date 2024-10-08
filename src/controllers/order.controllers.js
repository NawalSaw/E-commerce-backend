import { Order } from "../models/order.model";
import ApiHandler from "../utils/ApiHandler.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

//create order
const createOrder = ApiHandler(async (req, res) => {
  const {
    productIds,
    totalPrice,
    localAddress,
    pincode,
    city,
    state,
    country,
    email,
    username,
    fullName,
    phone,
    quantity,
  } = req.body;

  if (
    !productIds ||
    !totalPrice ||
    !address ||
    !email ||
    !username ||
    !fullName ||
    !phone ||
    !quantity
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const order = await Order.create({
    product: [productIds],
    totalPrice,
    buyer: req.user._id,
    deliveryDetails: {
      address: {
        localAddress,
        pincode,
        city,
        state,
        country,
      },
      email,
      username,
      fullName,
      phone,
    },
    quantity,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res
    .status(201)
    .json(new ApiResponse(201, order, "Order created successfully"));
});

const updateStatus = ApiHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(
    { _id: req.params.orderId },
    { status },
    { new: true }
  );
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, order, "Order updated successfully"));
});

//get order by id
const getOrderById = ApiHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  res.status(200).json(new ApiResponse(200, order, "Order found"));
});

//delete order
const deleteOrder = ApiHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, null, "Order deleted successfully"));
});

export { createOrder, getOrderById, deleteOrder, updateStatus };
