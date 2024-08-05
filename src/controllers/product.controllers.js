import ApiHandler from "../utils/ApiHandler.js";
import { Variation } from "../models/variation.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Offer } from "../models/offer.model.js";
import { Category } from "../models/category.model.js";
import { Detail } from "../models/detail.model.js";
import { Review } from "../models/review.model.js";
import { uploadToCloudinary } from "../utils/uploadOnCloudinary.js";
import { Shop } from "./../models/shop.model.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { aggregatePaginate } from "mongoose-aggregate-paginate-v2";

// complex logic goes here

const getAllProducts = ApiHandler(async (req, res) => {
  const {
    query = "",
    category = "",
    brand = "",
    minPrice = "0",
    maxPrice = "",
    minRating = "0",
    inStock = false,
    sortBy = "createdAt",
    sortType = "desc",
    page = 1,
    limit = 10,
  } = req.query;

  let pipeline = [];

  if (query) {
    const categoryByName = await Category.findOne({
      name: { $regex: query, $options: "i" },
    });
    const detailByName = await Detail.findOne({
      brand: { $regex: query, $options: "i" },
    });
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: categoryByName?._id },
          { details: detailByName?._id },
        ],
      },
    });
  }

  if (category) {
    const categoryByName = await Category.findOne({
      name: { $regex: category, $options: "i" },
    });
    pipeline.push({ $match: { category: categoryByName?._id } });
  }

  if (brand) {
    const detailByName = await Detail.findOne({
      brand: { $regex: brand, $options: "i" },
    });
    pipeline.push({ $match: { details: detailByName?._id } });
  }

  if (minPrice) {
    pipeline.push({ $match: { price: { $gte: parseInt(minPrice) } } });
  }

  if (maxPrice) {
    pipeline.push({ $match: { price: { $lte: parseInt(maxPrice) } } });
  }

  if (minRating) {
    pipeline.push({ $match: { avgRating: { $gte: parseInt(minRating) } } });
  }

  if (inStock === "true") {
    pipeline.push({ $match: { inStock: true } });
  }

  if (sortBy || sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const products = await Product.aggregatePaginate(pipeline, options);

  if (!products || products.length === 0) {
    throw new ApiError(404, "Products not found");
  }

  res.status(200).json(new ApiResponse(200, products));
});

const autoComplete = ApiHandler(async (req, res) => {
  const { query = "", limit = 10 } = req.query;

  if (!query) {
    throw new ApiError(400, "Query parameter is required");
  }

  // Using a regex for partial match and case-insensitivity
  const matchStage = {
    $or: [
      { name: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
      { brand: { $regex: query, $options: "i" } },
    ],
  };

  const results = await Product.aggregate([
    { $match: matchStage },
    { $limit: parseInt(limit) },
    {
      $project: {
        name: 1,
        category: 1,
        brand: 1,
      },
    },
  ]);

  // Extracting unique suggestions
  const suggestions = results.map((result) => ({
    name: result.name,
    category: result.category,
    brand: result.brand,
  }));
  // filter the unique values
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) =>
      index === self.findIndex((s) => s.name === suggestion.name)
  );
  // sort the unique values
  uniqueSuggestions.sort((a, b) =>
    a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
  );

  res.status(200).json(new ApiResponse(200, uniqueSuggestions));
});

const addProduct = ApiHandler(async (req, res) => {
  const {
    name,
    productPrice,
    deliveryPrice,
    description,
    material,
    color,
    origin,
    manufacturer,
    brand,
    explanation,
    shipsFrom,
    extraDetail,
    variationType,
    variation,
    variationPrice,
    offerType,
    offerValue,
    categoryName,
    subCategoryName,
  } = req.body;

  if (
    !name ||
    !productPrice ||
    !description ||
    !material ||
    !color ||
    !origin ||
    !manufacturer ||
    !brand ||
    !explanation ||
    !categoryName ||
    !subCategoryName
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const checkForShop = await Shop.findOne({ owner: req.user._id });
  if (!checkForShop) {
    throw new ApiError(400, "Please add a shop first");
  }
  const productPreviewLocalPath = req.files.productPreview.map(
    (file) => file.path
  );

  if (!productPreviewLocalPath) {
    throw new ApiError(404, "productPreview is required");
  }

  const upload = async () => {
    const uploadPromises = productPreviewLocalPath.map(async (preview) => {
      const uploadResult = await uploadToCloudinary(preview);
      return uploadResult;
    });

    // Wait for all upload promises to resolve
    return await Promise.all(uploadPromises);
  };

  const productPreview = await upload();
  const url = productPreview.map((object) => {
    return object.url;
  });
  if (!productPreview) {
    throw new ApiError(
      500,
      "Something went wrong while uploading productPreview"
    );
  }

  let product = {
    name,
    productPrice,
    inStock: true,
    productPreview: [...url],
    description,
    offer: null,
    category: null,
    variation: [],
    shop: checkForShop._id,
    details: null,
  };

  console.log(product.productPreview);

  if (deliveryPrice) {
    product.deliveryPrice = deliveryPrice;
  }

  if (
    req.files &&
    Array.isArray(req.files.variationPreviews) &&
    req.files.variationPreviews.length > 0
  ) {
    const variationPreviewsLocalPath = req.files.variationPreviews.map(
      (file) => file.path
    );

    return variationPreviewsLocalPath;
  }

  if (
    variationType &&
    variation &&
    variationPrice &&
    variationPreviewsLocalPath
  ) {
    const variationPreviewsPromises = await Promise.all(
      variationPreviewsLocalPath.map(async (preview) => {
        const uploadResult = await uploadToCloudinary(preview);
        return uploadResult;
      })
    );
    const url = variationPreviewsPromises.map((object) => {
      return object.url;
    });
    const newVariation = await Variation.create({
      type: variationType,
      variation,
      price: variationPrice,
      previews: [...url],
    });

    if (!newVariation) {
      throw new ApiError(500, "Something went wrong while creating variation");
    }

    product.variation.push(newVariation._id);
  }

  if (offerType && offerValue) {
    const offer = await Offer.create({
      offerType,
      offerValue,
    });

    if (!offer) {
      throw new ApiError(500, "Something went wrong while creating offer");
    }

    product.offer = offer._id;
  }

  const categoryExists = await Category.findOne({
    name: categoryName.toLowerCase(),
  });
  if (categoryExists) {
    const subCategoryExists = await Category.findOne({
      parent_id: categoryExists._id,
    });

    if (subCategoryExists) {
      product.category = subCategoryExists._id;
    } else {
      const subCategory = await Category.create({
        name: subCategoryName.toLowerCase(),
        parent_id: categoryExists._id,
      });
      product.category = subCategory._id;
    }
  } else {
    const category = await Category.create({
      name: categoryName.toLowerCase(),
    });
    const subCategory = await Category.create({
      name: subCategoryName.toLowerCase(),
      parent_id: category._id,
    });
    product.category = subCategory._id;
  }

  const details = await Detail.create({
    material,
    color,
    origin,
    manufacturer,
    brand,
    explanation,
    shipsFrom,
    extraDetail,
  });

  product.details = details._id;

  if (!details) {
    throw new ApiError(404, "error while creating detail");
  }

  console.log(product);

  const newProduct = new Product({
    name: product.name,
    price: product.productPrice,
    inStock: product.inStock,
    deliveryPrice: product.deliveryPrice,
    previews: product.productPreview,
    description: product.description,
    offer: product.offer,
    category: product.category,
    variation: product.variation,
    shop: product.shop,
    details: product.details,
  });

  if (!newProduct) {
    throw new ApiError(500, "Something went wrong while creating product");
  }

  await newProduct.save();

  res
    .status(201)
    .json(new ApiResponse(201, newProduct, "Product created successfully"));
});

const addPreview = ApiHandler(async (req, res) => {
  const owner = await Product.findById(req.params.productId).populate("shop");
  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  const productPreview = req.files.productPreview.map((file) => file.path);
  if (!productPreview) {
    throw new ApiError(404, "productPreview is required");
  }

  const product = await Product.findById(req.params.productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Upload the previews to Cloudinary
  const productPreviewCloudinary = await Promise.all(
    productPreview.map(async (file) => {
      const upload = await uploadToCloudinary(file);
      if (!upload) {
        throw new ApiError(
          500,
          "Something went wrong while uploading productPreview"
        );
      }
      return upload;
    })
  );

  // Extract the URLs from the upload results
  const urls = productPreviewCloudinary.map((upload) => upload.url);

  if (!urls) {
    throw new ApiError(
      500,
      "Something went wrong while uploading productPreview"
    );
  }

  // Add the URLs to the product previews
  product.previews.push(...urls);
  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const removePreview = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { preview } = req.body;

  const owner = await Product.findById(productId).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!preview) {
    throw new ApiError(400, "preview is required");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const imageIndex = product.previews.indexOf(preview);
  if (imageIndex === -1) {
    throw new ApiError(404, "Image not found");
  }

  const image = product.previews[imageIndex];
  const ImgId = image.split("/").pop().split(".")[0];

  await cloudinary.uploader.destroy(ImgId);

  product.previews.splice(imageIndex, 1);

  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const updatePrimaryDetails = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { price, deliveryPrice, description, name } = req.body;

  const owner = await Product.findById(productId).populate("shop");
  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!price && !deliveryPrice && !description && !name) {
    throw new ApiError(400, "At least one field is required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (price) {
    product.price = price;
  }

  if (deliveryPrice) {
    product.deliveryPrice = deliveryPrice;
  }

  if (description) {
    product.description = description;
  }

  if (name) {
    product.name = name;
  }

  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const toggleStock = ApiHandler(async (req, res) => {
  const { productId } = req.params;

  const owner = await Product.findById(productId).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.inStock) {
    product.inStock = false;
    res.status(200).json(new ApiResponse(200, null, "Product out of stock"));
  } else {
    product.inStock = true;
    res.status(200).json(new ApiResponse(200, null, "Product in stock"));
  }

  await product.save();
});

const deleteProduct = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const owner = await Product.findOne({ _id: productId }).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  await Product.findByIdAndDelete({ _id: productId });
  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

const updateCategory = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { categoryName, subCategoryName } = req.body;

  const owner = await Product.findById(productId).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!categoryName || !subCategoryName) {
    throw new ApiError(400, "categoryName and subCategoryName are required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const category = await Category.findOne({ name: categoryName.toLowerCase() });
  if (category) {
    const subCategory = await Category.findOne({
      name: subCategoryName.toLowerCase(),
      parent_id: category._id,
    });

    if (subCategory) {
      product.category = subCategory._id;
    } else {
      const newSubCategory = await Category.create({
        name: subCategoryName.toLowerCase(),
        parent_id: category._id,
      });

      product.category = newSubCategory._id;
    }
  } else {
    const newCategory = await Category.create({
      name: categoryName.toLowerCase(),
    });

    const newSubCategory = await Category.create({
      name: subCategoryName.toLowerCase(),
      parent_id: newCategory._id,
    });

    product.category = newSubCategory._id;
  }

  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Category updated successfully"));
});

const addVariation = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { variationType, variation, variationPrice } = req.body;

  const owner = await Product.findById(productId).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const variationPreviewsLocalPath = req.files.variationPreviews.map(
    (file) => file.path
  );

  if (
    !variationType ||
    !variation ||
    !variationPrice ||
    !variationPreviewsLocalPath
  ) {
    throw new ApiError(
      400,
      "variationType, variation, variationPrice and variationPreviews are required"
    );
  }

  const variationPreviewsPromises = await Promise.all(
    variationPreviewsLocalPath.map(async (preview) => {
      const uploadResult = await uploadToCloudinary(preview);
      return uploadResult;
    })
  );
  const variationPreviews = variationPreviewsPromises.map((object) => {
    return object.url;
  });

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const newVariation = await Variation.create({
    type: variationType,
    variation,
    price: variationPrice,
    previews: [...variationPreviews],
  });

  product.variation.push(newVariation._id);
  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Variation added successfully"));
});

const updateVariation = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { variationType, variation, variationPrice, variationId } = req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!variationId) {
    throw new ApiError(400, "variationId is required");
  }

  // Extract the local paths of the variation previews if they exist
  const variationPreviewsLocalPath = req.files?.variationPreviews?.map(
    (file) => file.path
  );

  // Validate input
  if (
    !variationType &&
    !variation &&
    !variationPrice &&
    !variationPreviewsLocalPath
  ) {
    throw new ApiError(400, "At least one field is required");
  }

  // Find the product and verify the user's authorization
  const product = await Product.findById(productId).populate("shop");
  if (!product || product.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  // Find the variation info
  const variationInfo = await Variation.findById(variationId);
  if (!variationInfo) {
    throw new ApiError(404, "Variation not found");
  }

  // Upload the variation previews to Cloudinary if they exist
  let variationPreviews = [];
  if (variationPreviewsLocalPath) {
    const variationPreviewsPromises = variationPreviewsLocalPath.map(
      async (preview) => {
        const uploadResult = await uploadToCloudinary(preview);
        return uploadResult.url;
      }
    );
    variationPreviews = await Promise.all(variationPreviewsPromises);
  }

  // Update the variation info
  if (variationType) variationInfo.type = variationType;
  if (variation) variationInfo.variation = variation;
  if (variationPrice) variationInfo.price = variationPrice;
  if (variationPreviews.length > 0)
    variationInfo.previews.push(...variationPreviews);

  await variationInfo.save();

  res
    .status(200)
    .json(
      new ApiResponse(200, variationInfo, "Variation updated successfully")
    );
});

const deleteVariation = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { variationId } = req.body;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const owner = await Product.findById(productId).populate("shop");
  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!variationId) {
    throw new ApiError(400, "variationId is required");
  }

  const product = await Product.findByIdAndUpdate(
    { _id: productId },
    { $pull: { variation: variationId } },
    { new: true }
  );
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const variation = await Variation.findByIdAndDelete(variationId);
  if (!variation) {
    throw new ApiError(404, "Variation not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Variation deleted successfully"));
});

const addOffer = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { offerType, offerValue } = req.body;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const owner = await Product.findById(productId).populate("shop");

  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!offerType) {
    throw new ApiError(400, "offer is required");
  }

  const newOffer = await Offer.create({
    offerType,
  });

  if (!newOffer) {
    throw new ApiError(404, "error while creating offer");
  }
  if (offerValue) {
    newOffer.offerValue = offerValue;
  }

  const product = await Product.findByIdAndUpdate(
    { _id: productId },
    { offer: newOffer._id },
    { new: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json(new ApiResponse(200, null, "Offer added successfully"));
});

const removeOffer = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const product = await Product.findById(productId).populate("shop");
  if (product && product.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  if (!product.offer) {
    throw new ApiError(404, "Offer not found");
  }

  const offer = await Offer.findByIdAndDelete(product.offer);
  if (!offer) {
    throw new ApiError(404, "Offer not found");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: productId },
    { offer: null },
    { new: true }
  );
  if (!updatedProduct) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Offer removed successfully"));
});

const updateDetails = ApiHandler(async (req, res) => {
  const { productId, detailId } = req.params;
  const {
    material,
    color,
    origin,
    manufacturer,
    brand,
    explanation,
    shipsFrom,
    extraDetail,
  } = req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const owner = await Product.findById(productId).populate("shop");
  if (owner && owner.shop.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(404, "You are not authorized to perform this action");
  }

  const details = await Detail.findById(detailId);

  if (!details) {
    throw new ApiError(404, "Details not found");
  }

  if (material) {
    details.material = material;
  }

  if (color) {
    details.color = color;
  }

  if (origin) {
    details.origin = origin;
  }

  if (manufacturer) {
    details.manufacturer = manufacturer;
  }

  if (brand) {
    details.brand = brand;
  }

  if (explanation) {
    details.explanation = explanation;
  }

  if (shipsFrom) {
    details.shipsFrom = shipsFrom;
  }

  if (extraDetail) {
    details.extraDetail = extraDetail;
  }

  await details.save();
  res
    .status(200)
    .json(new ApiResponse(200, null, "Details updated successfully"));
});

const getProductById = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const product = await Product.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(productId)),
      },
    },

    {
      $lookup: {
        from: "offers",
        localField: "offer",
        foreignField: "_id",
        as: "offer",
        pipeline: [
          {
            $project: {
              _id: 0,
              offerType: 1,
              offerValue: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "subCategories",
        pipeline: [
          {
            $lookup: {
              from: "categories",
              localField: "parent_id",
              foreignField: "_id",
              as: "categories",
              pipeline: [
                {
                  $project: {
                    _id: 0,
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 0,
              name: 1,
              categories: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "variations",
        localField: "variation",
        foreignField: "_id",
        as: "variations",
        pipeline: [
          {
            $project: {
              _id: 0,
              type: 1,
              variation: 1,
              price: 1,
              previews: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "shops",
        localField: "shop",
        foreignField: "_id",
        as: "shop",
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1,
              address: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "details",
        localField: "details",
        foreignField: "_id",
        as: "details",
        pipeline: [
          {
            $project: {
              _id: 0,
              material: 1,
              color: 1,
              origin: 1,
              manufacturer: 1,
              brand: 1,
              explanation: 1,
              shipsFrom: 1,
              extraDetail: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        offer: { $arrayElemAt: ["$offer", 0] },
        subCategories: { $arrayElemAt: ["$subCategories", 0] },
        variation: "$variations",
        shop: { $arrayElemAt: ["$shop", 0] },
        details: { $arrayElemAt: ["$details", 0] },
      },
    },

    {
      $project: {
        _id: 0,
        name: 1,
        price: 1,
        inStock: 1,
        description: 1,
        deliveryPrice: 1,
        offer: 1,
        previews: 1,
        subCategories: 1,
        variation: 1,
        shop: 1,
        details: 1,
      },
    },
  ]);

  const avgRating = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(String(productId)),
      },
    },
    {
      $group: {
        _id: null,
        avgRating: {
          $avg: "$rating",
        },
      },
    },
    {
      $project: {
        _id: 0,
        avgRating: 1,
      },
    },
  ]);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: productId },
    { $set: { avgRating: avgRating[0] || "5" } }
  );

  if (!updatedProduct) {
    throw new ApiError(404, "Product not found");
  }

  console.log(avgRating);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        product[0],
        avgRating[0],
        "Product found successfully"
      )
    );
});

const getReviews = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  const reviews = await Review.find({ product: productId })
    .populate("owner")
    .select("-product");

  if (!reviews) {
    throw new ApiError(404, "Reviews not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews found successfully"));
});

export {
  getAllProducts,
  addProduct,
  deleteProduct,
  getProductById,
  getReviews,
  updatePrimaryDetails,
  toggleStock,
  updateCategory,
  addVariation,
  updateVariation,
  deleteVariation,
  removeOffer,
  addOffer,
  updateDetails,
  addPreview,
  autoComplete,
  removePreview,
};
