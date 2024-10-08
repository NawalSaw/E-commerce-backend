import express from "express";
import {
  createShop,
  getShopById,
  getMyShop,
  deleteShop,
  updateMyShop,
} from "../controllers/shop.controllers.js";
import JWTCheck from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(JWTCheck);
router
  .route("/")
  .get(getMyShop)
  .post(createShop)
  .delete(deleteShop)
  .patch(updateMyShop);
router.route("/:shopId").get(getShopById);

export default router;
