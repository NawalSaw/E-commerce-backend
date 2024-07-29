import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./utils/globalErrorHandler.js";
import rateLimit from "express-rate-limit";

const app = express();

const apiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // Limit each IP to 10 requests per `window` (here, per 30 minutes)
  message: "Too many requests from this IP, please try again after 30 minutes",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(globalErrorHandler);

// Routes

import userRoute from "./routes/user.routes.js";

app.use("/api/v1/users", userRoute);

export default app;
