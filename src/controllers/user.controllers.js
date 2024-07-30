import ApiHandler from "./../utils/ApiHandler.js";
import { User } from "./../models/user.model.js";
import { ApiError } from "./../utils/ApiError.js";
import sendMailToUser from "./../utils/Mail.js";
import ApiResponse from "./../utils/ApiResponse.js";
import { Otp } from "./../models/otp.model.js";
import { uploadToCloudinary } from "./../utils/uploadOnCloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { Cart } from "./../models/cart.model.js";
import { Wishlist } from "../models/wishlist.model.js";
import { Order } from "../models/order.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (user) => {
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  if (!refreshToken || !accessToken) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const signupUser = ApiHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;
  if (!username || !email || !password || !fullName) {
    throw new ApiError(400, "All fields are required");
  }

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    throw new ApiError(400, "User already exists");
  }

  const user = await User.create({
    username,
    email,
    password,
    fullName,
  });

  if (!user) {
    throw new ApiError(400, "Something went wrong while creating user");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sendMailToUser(email, code);

  const otpEntry = await Otp.create({
    code,
    email,
  });

  if (!otpEntry) {
    throw new ApiError(500, "Something went wrong while creating OTP");
  }

  const createdUser = await User.findById(user._id).select(
    "-password refreshToken"
  );

  res
    .status(201)
    .json(new ApiResponse(201, createdUser, `OTP sent to ${email}`));
});

const verifyOTP = ApiHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw new ApiError(400, "All fields are required");
  }

  const otpEntry = await Otp.findOne({ code });
  if (!otpEntry) {
    await Otp.deleteMany({ createdAt: { $lt: Date.now() - 5 * 60 * 1000 } });
    throw new ApiError(400, "Invalid OTP");
  }

  const user = await User.findOne({ email: otpEntry.email });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user
  );

  await Otp.findByIdAndDelete(otpEntry._id);

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json(new ApiResponse(200, "OTP verified successfully"));
});

const reSendOTP = ApiHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "All fields are required");
  }

  const existingOtp = await Otp.findOne({ email });
  if (existingOtp) {
    await Otp.deleteMany({ createdAt: { $lt: Date.now() - 5 * 60 * 1000 } });
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sendMailToUser(email, code);

  const otpEntry = await Otp.create({ email, code });
  if (!otpEntry) {
    throw new ApiError(500, "Something went wrong while creating OTP");
  }

  res.status(201).json(new ApiResponse(201, `OTP sent to ${email}`));
});

const loginUser = ApiHandler(async (req, res) => {
  // get username and password from req.body
  // check if user exists
  // password is correct
  // generate token
  // set token
  // send response

  const { username, password, email } = req.body;

  if ((!username && !email) || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "incorrect credentials");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(404, "incorrect credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user
  );

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const otpEntry = await Otp.create({ email, code });
  if (!otpEntry) {
    throw new ApiError(500, "Something went wrong while creating OTP");
  }

  sendMailToUser(email, code);

  res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json(
      new ApiResponse(
        200,
        {
          AccessToken: accessToken,
          RefreshToken: refreshToken,
        },
        "Login successful an OTP has been sent"
      )
    );
});

const resetPassword = ApiHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;
  if (!newPassword || !confirmPassword || newPassword.trim() === "") {
    throw new ApiError(400, "All fields are required");
  }

  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character with length 8-20"
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findOneAndReplace(
    { _id: req.user._id },
    { password: newPassword },
    { new: true }
  );
  if (!user) {
    throw new ApiError(404, "error while resetting password");
  }

  res.status(200).json(new ApiResponse(200, "Password reset successful"));
});

const getUser = ApiHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const logOutUser = ApiHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: "" },
  });
  res
    .status(200)
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const updateUserAvatar = ApiHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const avatarLocalPath = req.file.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  if (user.avatar) {
    const avatarPathToDelete = user.avatar
      .toString()
      .split("/")
      .pop()
      .split(".")[0];
    const avatarCloudinaryPath =
      cloudinary.uploader.destroy(avatarPathToDelete);
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);

  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const updateUserPassword = ApiHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (
    !oldPassword ||
    !newPassword ||
    !confirmPassword ||
    oldPassword.trim() === "" ||
    newPassword.trim() === "" ||
    confirmPassword.trim() === ""
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Modified regex for a string password
  // Example password: Abc1@A
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;

  if (!passwordRegex.test(newPassword.toString())) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character with length 8-20"
    );
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(200, null, "User password updated successfully"));
});

const createUserAddress = ApiHandler(async (req, res) => {
  const { localAddress, country, state, city, pincode } = req.body;
  if (!localAddress || !country || !state || !city || !pincode) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $push: { address: { localAddress, country, state, city, pincode } },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "error while creating address");
  }
  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Address created successfully"));
});

const removeUserAddress = ApiHandler(async (req, res) => {
  const { localAddress, country, state, city, pincode } = req.body;
  if (!localAddress || !country || !state || !city || !pincode) {
    throw new ApiError(400, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { address: { localAddress, country, state, city, pincode } },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "error while creating address");
  }
  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Address removed successfully"));
});

const updateUserDetails = ApiHandler(async (req, res) => {
  const { username, email, fullName } = req.body;
  if (!username && !email && !fullName) {
    throw new ApiError(400, "At least one field is required");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (username) {
    const userExists = await User.findOne({ username });
    if (userExists) {
      throw new ApiError(400, "User already exists");
    }

    user.username = username.toLowerCase();
  }

  if (email) {
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ApiError(400, "User with this email already exists");
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpEntry = await Otp.create({
      code,
      email,
    });

    if (!otpEntry) {
      throw new ApiError(500, "Something went wrong while creating OTP");
    }
    sendMailToUser(email, code);
    user.email = email;
    return res
      .status(200)
      .json(new ApiResponse(200, user, "OTP sent successfully"));
  }

  if (fullName) {
    user.fullName = fullName;
  }

  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const refreshAccessToken = ApiHandler(async (req, res) => {
  // get the refresh token from the request cookie
  // verify the refresh token
  // get the user from the database
  // generate new access and refresh token
  // set the access and refresh token in the cookie
  // send response

  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  if (!decoded) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.refreshToken !== refreshToken) {
    throw new ApiError(401, "unauthorized to refresh access token");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(user);

  res
    .cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
    })
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refreshed successfully"
      )
    );
});

const getProductInUserCart = ApiHandler(async (req, res) => {
  // get the cart from the database which have req.user._id in its user field
  // get the productIds from the cart
  // get the products from the database
  // return the products
  // response status 200

  const userProductsInCart = await Cart.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(String(req.user._id)),
      },
    },
    {
      $unwind: "$products",
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $addFields: {
        products: "$product",
      },
    },

    {
      $project: {
        products: 1,
      },
    },
  ]);

  console.log(userProductsInCart);
  if (!userProductsInCart) {
    throw new ApiError(404, "error while fetching cart");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, userProductsInCart, "Cart fetched successfully")
    );
});

const getUserWishList = ApiHandler(async (req, res) => {
  const userWishList = await Wishlist.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(String(req.user._id)),
      },
    },
    {
      $unwind: "$products",
    },
    {
      $lookup: {
        from: "products",
        localField: "products.product",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $addFields: {
        products: "$product",
      },
    },
    {
      $project: {
        products: 1,
      },
    },
  ]);

  if (!userWishList) {
    throw new ApiError(404, "error while fetching wishlist");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, userWishList[0], "WishList fetched successfully")
    );
});

const getUserOrders = ApiHandler(async (req, res) => {
  const userOrders = await Order.aggregate([
    {
      $match: {
        buyer: new mongoose.Types.ObjectId(String(req.user._id)),
      },
    },
  ]);

  if (!userOrders) {
    throw new ApiError(404, "error while fetching orders");
  }

  res
    .status(200)
    .json(new ApiResponse(200, userOrders[0], "Orders fetched successfully"));
});

export {
  signupUser,
  loginUser,
  getUser,
  updateUserAvatar,
  updateUserDetails,
  updateUserPassword,
  createUserAddress,
  removeUserAddress,
  getProductInUserCart,
  getUserWishList,
  logOutUser,
  getUserOrders,
  verifyOTP,
  reSendOTP,
  resetPassword,
  refreshAccessToken,
};
