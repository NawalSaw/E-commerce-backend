import { User } from "./../models/user.model";
import ApiError from "./../utils/ApiError";

const JWTCheck = async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  if (!decoded) {
    throw new ApiError(401, "invalid token");
  }

  const user = await User.findById(decoded._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(401, "invalid user");
  }

  req.user = user;
  return next();
};

export default JWTCheck;
