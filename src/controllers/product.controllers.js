import ApiHandler from "./../utils/ApiHandler.js";
import { Variation } from "../models/variation.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Offer } from "../models/offer.model.js";
import { Category } from "../models/category.model.js";
import { Detail } from "../models/detail.model.js";
import { uploadToCloudinary } from "./../utils/uploadOnCloudinary";
import { Review } from "../models/review.model.js";

// complex logic goes here

const getAllProducts = ApiHandler(async (req, res) => {
  const {
    query,
    category,
    brand,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    sortBy,
    page = 1,
    limit = 10,
  } = req.query;

  let matchStage = {};
  if (query) {
    matchStage.$text = { $search: query };
  }
  if (category) {
    matchStage.category = category;
  }
  if (brand) {
    matchStage.brand = brand;
  }
  if (minPrice || maxPrice) {
    matchStage.price = {};
    if (minPrice) matchStage.price.$gte = parseFloat(minPrice);
    if (maxPrice) matchStage.price.$lte = parseFloat(maxPrice);
  }
  if (minRating) {
    matchStage.rating = { $gte: parseFloat(minRating) };
  }
  if (inStock) {
    matchStage.stock = { $gt: 0 };
  }

  let sortStage = {};
  if (sortBy) {
    const [field, order] = sortBy.split(":");
    sortStage[field] = order === "desc" ? -1 : 1;
  }

  const skip = (page - 1) * limit;

  const [products, facets] = await Promise.all([
    Product.aggregate([
      { $match: matchStage },
      { $sort: { ...sortStage, score: { $meta: "textScore" } } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          price: 1,
          brand: 1,
          rating: 1,
          stock: 1,
          score: { $meta: "textScore" },
        },
      },
    ]),
    Product.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "details",
          localField: "details",
          foreignField: "_id",
          as: "details",
        },
      },
      {
        $facet: {
          categoryCounts: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          brandCounts: [
            { $group: { _id: "$details.brand", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ],
        },
      },
    ]),
  ]);

  const totalResults = await Product.countDocuments(matchStage);
  const totalPages = Math.ceil(totalResults / limit);

  res.json({
    results: products,
    page: parseInt(page),
    totalPages,
    totalResults,
    facets: facets[0],
  });
});

const autoComplete = ApiHandler(async (req, res) => {
  const { term } = req.query;

  if (!term) {
    return res.status(400).json({ error: "Search term is required" });
  }

  try {
    const suggestions = await Product.aggregate([
      {
        $match: {
          $text: { $search: term },
        },
      },
      {
        $project: {
          name: 1,
          score: { $meta: "textScore" },
        },
      },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: 10 },
    ]);

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching autocomplete suggestions",
    });
  }
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

  const checkForShop = await Shop.findOne({ user: req.user._id });
  if (!checkForShop) {
    throw new ApiError(400, "Please add a shop first");
  }
  const productPreviewLocalPath = req.files.productPreview.map(
    (file) => file.path
  );
  if (!productPreviewLocalPath) {
    throw new ApiError(404, "productPreview is required");
  }

  const productPreview = await Promise.all(
    uploadToCloudinary(productPreviewLocalPath)
  );
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
    productPreview: [...productPreview.url],
    description,
    offer: null,
    category: null,
    variation: [],
    shop: checkForShop._id,
    details: null,
  };

  if (deliveryPrice) {
    product.deliveryPrice = deliveryPrice;
  }

  const variationPreviewsLocalPath = req.files.variationPreviews.map(
    (file) => file.path
  );
  if (
    variationType &&
    variation &&
    variationPrice &&
    variationPreviewsLocalPath
  ) {
    const variationPreviews = await Promise.all(
      uploadToCloudinary(variationPreviewsLocalPath)
    );
    if (!variationPreviews) {
      throw new ApiError(
        500,
        "Something went wrong while uploading variationPreviews"
      );
    }
    const newVariation = await Variation.create({
      type: variationType,
      variation,
      price: variationPrice,
      previews: [...variationPreviews.url],
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
    manufacturer,
    brand,
    origin,
    explanation,
    shipsFrom,
    extraDetail,
  });

  product.details = details._id;

  if (!details) {
    throw new ApiError(404, "error while creating detail");
  }

  const newProduct = new Product({
    name: product.name,
    price: product.productPrice,
    inStock: product.inStock,
    deliveryPrice: product.deliveryPrice,
    productPreview: product.productPreview,
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

  res.status(201).json(new ApiResponse(201, "Product created successfully"));
});

const addPreview = ApiHandler(async (req, res) => {
  const productPreview = req.file.productPreview.map((file) => file.path);
  if (!productPreview) {
    throw new ApiError(404, "productPreview is required");
  }

  const product = await Product.findById(req.params.productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const productPreviewCloudinary = await uploadToCloudinary(productPreview);
  if (!productPreviewCloudinary) {
    throw new ApiError(
      500,
      "Something went wrong while uploading productPreview"
    );
  }

  product.previews.push(...productPreviewCloudinary.url);
  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

const removePreview = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { preview } = req.body;
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

  await Product.findByIdAndDelete(productId);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

const updateCategory = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { categoryName, subCategoryName } = req.body;

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
  const { variationType, variation, variationPrice, variationPreviews } =
    req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!variationType || !variation || !variationPrice || !variationPreviews) {
    throw new ApiError(
      400,
      "variationType, variation, variationPrice and variationPreviews are required"
    );
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const newVariation = await Variation.create({
    type: variationType,
    variation,
    price: variationPrice,
    previews: [variationPreviews],
  });

  product.variations.push(newVariation._id);
  await product.save();

  res
    .status(200)
    .json(new ApiResponse(200, product, "Variation added successfully"));
});

const updateVariation = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const {
    variationId,
    variationType,
    variation,
    variationPrice,
    variationPreviews,
  } = req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  if (!variationId) {
    throw new ApiError(400, "variationId is required");
  }

  const variationInfo = await Variation.findById(variationId);
  if (!variationInfo) {
    throw new ApiError(404, "Variation not found");
  }

  if (variationType) {
    variationInfo.type = variationType;
  }

  if (variation) {
    variationInfo.variation = variation;
  }

  if (variationPrice) {
    variationInfo.price = variationPrice;
  }

  if (variationPreviews) {
    variationInfo.previews.push(variationPreviews);
  }
});

const deleteVariation = ApiHandler(async (req, res) => {
  const { productId } = req.params;
  const { variationId } = req.body;
  if (!productId) {
    throw new ApiError(400, "productId is required");
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

  if (!offerType || !offerValue) {
    throw new ApiError(400, "offer is required");
  }

  const newOffer = await Offer.create({
    type: offerType,
    value: offerValue,
  });

  if (!newOffer) {
    throw new ApiError(404, "error while creating offer");
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

  const product = await Product.findByIdAndUpdate(
    { _id: productId },
    { offer: null },
    { new: true }
  );
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Offer removed successfully"));
});

const updateDetails = ApiHandler(async (req, res) => {
  const { productId } = req.params;
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

  const product = await Product.findById(productId);
  const details = await Detail.findById(product.details);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
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
        _id: mongoose.Types.ObjectId(String(productId)),
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
        product:
          mongoose.Types.ObjectId(String(productId)) ||
          mongoose.Types.ObjectId(productId),
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
  res
    .status(200)
    .json(new ApiResponse(200, reviews, "Reviews found successfully"));
});

export {
  getAllProducts,
  addProduct,
  updatePreview,
  deleteProduct,
  getProductById,
  getAverageRating,
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
