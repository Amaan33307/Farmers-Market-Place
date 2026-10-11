const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");

const { getPriceInsight } = require("../services/priceInsight");
const { getSimilarProducts } = require("../services/recommendations");

const {
    PRODUCT_CATEGORIES,
    PRODUCT_UNITS
} = require("../config/constants");

const {
    setFlash,
    renderError,
    escapeRegex,
    isValidId
} = require("../utils/helpers");


// =====================================================
// VALIDATE PRODUCT FORM
// Returns { error, data }. Used by add and edit.
// =====================================================

function validateProductInput(body) {

    const name = (body.name || "").trim();
    const category = (body.category || "").trim();
    const description = (body.description || "").trim();
    const unit = (body.unit || "").trim();
    const location = (body.location || "").trim();
    const image = (body.image || "").trim();
    const price = Number(body.price);
    const quantity = Number(body.quantity);


    if (!name || !category || !description || !unit || !location || body.price === "" || body.quantity === "") {
        return { error: "Please fill in all required fields." };
    }

    if (name.length > 100) {
        return { error: "Product name cannot exceed 100 characters." };
    }

    if (description.length > 1000) {
        return { error: "Description cannot exceed 1000 characters." };
    }

    if (!PRODUCT_CATEGORIES.includes(category)) {
        return { error: "Please select a valid category." };
    }

    if (!PRODUCT_UNITS.includes(unit)) {
        return { error: "Please select a valid unit." };
    }

    if (!Number.isFinite(price) || price <= 0) {
        return { error: "Price must be greater than 0." };
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
        return { error: "Quantity must be a whole number (0 or more)." };
    }

    if (image && !/^https?:\/\/\S+$/i.test(image)) {
        return { error: "Image URL must start with http:// or https://" };
    }


    return {
        data: {
            name,
            category,
            description,
            price: Math.round(price * 100) / 100,
            quantity,
            unit,
            location,
            image
        }
    };

}


// =====================================================
// MARKETPLACE — SEARCH & FILTER
// GET /products/marketplace
// =====================================================

const showMarketplace = async (req, res) => {

    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const location = String(req.query.location || "").trim();
    const farmerId = String(req.query.farmer || "").trim();


    const filter = {};

    if (search) {
        filter.name = {
            $regex: escapeRegex(search),
            $options: "i"
        };
    }

    if (category && PRODUCT_CATEGORIES.includes(category)) {
        filter.category = category;
    }

    if (location) {
        filter.location = {
            $regex: escapeRegex(location),
            $options: "i"
        };
    }


    // Optional: products of one farmer (from Farmers page)
    let farmerFilterName = null;

    if (farmerId && isValidId(farmerId)) {

        filter.farmer = farmerId;

        const farmerUser =
            await User.findById(farmerId).select("name");

        farmerFilterName = farmerUser ? farmerUser.name : null;

    }


    const products =
        await Product
            .find(filter)
            .sort({
                createdAt: -1
            });


    // Show in-stock products first
    products.sort(
        (a, b) => (b.quantity > 0) - (a.quantity > 0)
    );


    res.render(
        "marketplace",
        {
            title: "Marketplace",
            products,
            search,
            category,
            location,
            farmerId: farmerFilterName ? farmerId : "",
            farmerFilterName,
            categories: PRODUCT_CATEGORIES
        }
    );

};


// =====================================================
// SHOW ADD PRODUCT PAGE
// GET /products/add
// =====================================================

const showAddProductPage = (req, res) => {

    const old = req.session.oldInput || {};

    delete req.session.oldInput;

    res.render("add-product", {
        title: "Add Product",
        old,
        categories: PRODUCT_CATEGORIES,
        units: PRODUCT_UNITS
    });

};


// =====================================================
// ADD PRODUCT
// POST /products/add
// =====================================================

const addProduct = async (req, res) => {

    const { error, data } = validateProductInput(req.body);

    if (error) {

        req.session.oldInput = req.body;

        setFlash(req, "danger", error);

        return res.redirect("/products/add");

    }


    const product = new Product({

        ...data,

        farmer: req.session.userId,

        farmerName: req.session.userName

    });


    await product.save();


    console.log(
        "✅ Product added:",
        product.name
    );


    setFlash(
        req,
        "success",
        `"${product.name}" was added to the marketplace.`
    );

    res.redirect("/products/my-products");

};


// =====================================================
// MY PRODUCTS
// GET /products/my-products
// =====================================================

const showMyProducts = async (req, res) => {

    const products =
        await Product
            .find({
                farmer: req.session.userId
            })
            .sort({
                createdAt: -1
            });


    // Pending request count per product
    const pending =
        await Order.find({
            farmer: req.session.userId,
            status: "pending"
        }).select("product");

    const pendingCounts = {};

    pending.forEach((order) => {
        const key = String(order.product);
        pendingCounts[key] = (pendingCounts[key] || 0) + 1;
    });


    res.render(
        "my-products",
        {
            title: "My Products",
            products,
            pendingCounts
        }
    );

};


// =====================================================
// Load a product that belongs to the logged-in farmer.
// Sends 404/403 pages itself and returns null if not
// allowed.
// =====================================================

async function findOwnProduct(req, res) {

    const product =
        await Product.findById(req.params.id);


    if (!product) {

        renderError(res, 404, "Product not found. It may have been deleted.");

        return null;

    }


    if (product.farmer.toString() !== req.session.userId.toString()) {

        renderError(res, 403, "You can only manage your own products.");

        return null;

    }


    return product;

}


// =====================================================
// SHOW EDIT PRODUCT PAGE
// GET /products/:id/edit
// =====================================================

const showEditProductPage = async (req, res) => {

    const product = await findOwnProduct(req, res);

    if (!product) return;


    // If the last save failed, show what was typed
    const old = req.session.oldInput || null;

    delete req.session.oldInput;


    res.render(
        "edit-product",
        {
            title: "Edit Product",
            product,
            old,
            categories: PRODUCT_CATEGORIES,
            units: PRODUCT_UNITS
        }
    );

};


// =====================================================
// UPDATE PRODUCT
// POST /products/:id/edit
// =====================================================

const updateProduct = async (req, res) => {

    const product = await findOwnProduct(req, res);

    if (!product) return;


    const { error, data } = validateProductInput(req.body);

    if (error) {

        req.session.oldInput = req.body;

        setFlash(req, "danger", error);

        return res.redirect(`/products/${product._id}/edit`);

    }


    Object.assign(product, data);

    await product.save();


    setFlash(req, "success", "Product updated successfully.");

    res.redirect(`/products/${product._id}`);

};


// =====================================================
// DELETE PRODUCT
// POST /products/:id/delete
// Pending requests for this product are rejected and
// the buyers are notified.
// =====================================================

const deleteProduct = async (req, res) => {

    const product = await findOwnProduct(req, res);

    if (!product) return;


    const pendingOrders =
        await Order.find({
            product: product._id,
            status: "pending"
        });


    for (const order of pendingOrders) {

        order.status = "rejected";

        await order.save();

        await Notification.create({
            recipient: order.buyer,
            sender: req.session.userId,
            order: order._id,
            title: "Request Rejected",
            message: `${order.productName} is no longer available, so your request was closed.`,
            type: "rejected"
        });

    }


    await Product.findByIdAndDelete(product._id);


    setFlash(
        req,
        "success",
        `"${product.name}" was deleted.` +
        (pendingOrders.length ? ` ${pendingOrders.length} pending request(s) were closed.` : "")
    );

    res.redirect("/products/my-products");

};


// =====================================================
// PRODUCT DETAILS
// GET /products/:id
// =====================================================

const showProductDetails = async (req, res) => {

    const product =
        await Product
            .findById(req.params.id)
            .populate(
                "farmer",
                "name phone"
            );


    if (!product) {

        return renderError(res, 404, "Product not found. It may have been removed by the farmer.");

    }


    const userId = req.session.userId;

    const farmerId =
        product.farmer && product.farmer._id
            ? product.farmer._id.toString()
            : String(product.farmer);

    const isOwner = Boolean(userId) && farmerId === userId.toString();


    // Does this buyer already have a pending request?
    let pendingRequest = null;

    if (req.session.role === "buyer") {

        pendingRequest =
            await Order.findOne({
                product: product._id,
                buyer: userId,
                status: "pending"
            });

    }


    // AI price insight: compare with similar listings
    // (the product itself is excluded)
    const priceInsight =
        await getPriceInsight(
            {
                name: product.name,
                category: product.category,
                unit: product.unit,
                location: product.location,
                price: product.price
            },
            {
                excludeId: product._id
            }
        );


    const similarProducts = await getSimilarProducts(product, 3);


    res.render(
        "product-details",
        {
            title: product.name,
            product,
            isOwner,
            pendingRequest,
            priceInsight,
            similarProducts
        }
    );

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    validateProductInput,

    showMarketplace,

    showAddProductPage,

    addProduct,

    showMyProducts,

    showEditProductPage,

    updateProduct,

    deleteProduct,

    showProductDetails

};
