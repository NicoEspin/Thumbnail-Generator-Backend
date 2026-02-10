import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("Connected to MongoDB"),
    );
    await mongoose.connect(process.env.MONGO_URI as string);
  } catch (error) {
    console.log("error connecting to MongoDB", error);
  }
};

export default connectDB;
