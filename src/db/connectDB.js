import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🔗MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error in MongoDB Connection: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
