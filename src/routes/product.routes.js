import express from "express";
import { getAllProducts } from "../controllers/product.controllers.js";
import { autoComplete } from "../controllers/product.controllers.js";
import { addProduct } from "../controllers/product.controllers.js";
import JWTCheck from "./../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { addPreview } from "../controllers/product.controllers.js";
import { removePreview } from "../controllers/product.controllers.js";
import { updatePrimaryDetails } from "../controllers/product.controllers.js";
import { toggleStock } from "../controllers/product.controllers.js";
import { deleteProduct } from "../controllers/product.controllers.js";
import { updateCategory } from "../controllers/product.controllers.js";
import { addVariation } from "../controllers/product.controllers.js";
import { updateVariation } from "../controllers/product.controllers.js";
import { deleteVariation } from "../controllers/product.controllers.js";
import { addOffer } from "../controllers/product.controllers.js";
import { updateDetails } from "../controllers/product.controllers.js";
import { getProductById } from "../controllers/product.controllers.js";
import { getReviews } from "../controllers/product.controllers.js";

const router = express.Router();

router.use(JWTCheck);
router.route("/auto-suggest").get(autoComplete);
router
  .route("/")
  .get(getAllProducts)
  .post(
    upload.fields([{ name: "productPreview" }, { name: "variationPreviews" }]),
    addProduct
  )
  .delete(deleteProduct);
router
  .route("/a/:productId")
  .patch(upload.fields(["productPreview"]), addPreview);

router
  .route("/r/:productId")
  .patch(upload.fields(["productPreview"]), removePreview);

router.route("/u/primary/:productId").patch(updatePrimaryDetails);
router.route("/toggle-stock/:productId").patch(toggleStock);
router.route("/c/:productId").patch(updateCategory);
router
  .route("/variation/:productId")
  .post(addVariation)
  .patch(updateVariation)
  .delete(deleteVariation);
router.route("/offer/:productId").post(addOffer).delete(deleteProduct);
router.route("/details/u/:productId").patch(updateDetails);
router.route("/:productId").get(getProductById);
router.route("/reviews/:productId").get(getReviews);

export default router;
