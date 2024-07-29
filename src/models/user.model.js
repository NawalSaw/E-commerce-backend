import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const addressSchema = new mongoose.Schema({
  localAddress: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please fill a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      unique: true,
    },
    avatar: {
      type: String,
      required: true,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
    },
    refreshToken: {
      type: String,
    },
    address: [addressSchema],
  },
  { timestamps: true }
);

//hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//JWT
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

//JWT
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

//JWT
userSchema.methods.verifyRefreshToken = function (refreshToken) {
  const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  return payload;
};

export const User = mongoose.model("User", userSchema);
