import mongoose from "mongoose";

const detailSchema = new mongoose.Schema({
  material: {
    type: String,
  },
  color: {
    type: String,
  },
  origin: {
    type: String,
  },
  manufacturer: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
  },
  shipsFrom: {
    type: String,
  },
  extraDetail: {
    type: Object,
  },
});

export const Detail = mongoose.model("Detail", detailSchema);
