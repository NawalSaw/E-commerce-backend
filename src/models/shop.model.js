import mongoose from "mongoose";

const Address = new mongoose.Schema({
  localAddress: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
});

const shopschema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  address: {
    type: Address,
    required: true,
  },
});

// Generate a document using shop schema
// const shop = new Shop({
//     name: 'My Shop',
//     owner: '64553587e093d15088326884',
//     address: {
//         localAddress: '123 Main St',
//         pincode: '12345',
//         city: 'New York',
//         state: 'NY',
//         country: 'USA',
//     }
// });

// shop.save().then((doc) => {
//     console.log(doc);
// }).catch((err) => {
//     console.log(err);
// });

export const Shop = mongoose.model("Shop", shopschema);
