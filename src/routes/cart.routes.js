import express from "express";
import JWTCheck from "../middlewares/auth.middleware.js";
import {
  addToCart,
  clearCart,
  removeFromCart,
  updateQuantityOfProduct,
} from "../controllers/cart.controllers.js";

const router = express.Router();

router.use(JWTCheck);
router.route("/:productId").post(addToCart).patch(removeFromCart);
router.route("/:productId").patch(updateQuantityOfProduct);
router.route("/").post(clearCart);

export default router;
