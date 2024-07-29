import app from "./app.js";
import connectDB from "./db/connectDB.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error in connecting to db", error);
      throw error;
    });

    app.listen(port, () => {
      console.log(`⚙ Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.log("error in connecting to db", error);
  });
