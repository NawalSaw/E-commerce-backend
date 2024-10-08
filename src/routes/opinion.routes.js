import express from "express";
import JWTCheck from "../middlewares/auth.middleware.js";
import {
  createOpinion,
  getHelpfulOpinions,
  removeOpinion,
} from "../controllers/opinion.controllers.js";

const router = express.Router();

router.use(JWTCheck);
router
  .route("/:reviewId")
  .post(createOpinion)
  .delete(removeOpinion)
  .get(getHelpfulOpinions);

export default router;
