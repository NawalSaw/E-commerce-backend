import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./utils/globalErrorHandler.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(globalErrorHandler);

// Routes

import userRoute from "./routes/user.routes.js";
import productRoute from "./routes/product.routes.js";
import opinionRoute from "./routes/opinion.routes.js";
import shopRoute from "./routes/shop.routes.js";
import reviewRoute from "./routes/review.routes.js";
import cartRoutes from "./routes/cart.routes.js";

app.use("/api/v1/carts", cartRoutes);
app.use("/api/v1/opinions", opinionRoute);
app.use("/api/v1/reviews", reviewRoute);
app.use("/api/v1/shops", shopRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/users", userRoute);

export default app;
