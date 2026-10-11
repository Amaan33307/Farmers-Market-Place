const express = require("express");

const router = express.Router();

const {
    showMarketplace,
    showAddProductPage,
    addProduct,
    showMyProducts,
    showEditProductPage,
    updateProduct,
    deleteProduct,
    showProductDetails
} = require("../controller/productController");

const {
    requireFarmer,
    validateId
} = require("../middleware/auth");


// =====================================================
// MARKETPLACE (PUBLIC)
// GET /products/marketplace
// =====================================================

router.get(
    "/marketplace",
    showMarketplace
);


// =====================================================
// ADD PRODUCT (FARMER)
// =====================================================

router.get(
    "/add",
    requireFarmer,
    showAddProductPage
);

router.post(
    "/add",
    requireFarmer,
    addProduct
);


// =====================================================
// MY PRODUCTS (FARMER)
// =====================================================

router.get(
    "/my-products",
    requireFarmer,
    showMyProducts
);


// =====================================================
// EDIT PRODUCT (FARMER — OWNER ONLY)
// =====================================================

router.get(
    "/:id/edit",
    requireFarmer,
    validateId("id"),
    showEditProductPage
);

router.post(
    "/:id/edit",
    requireFarmer,
    validateId("id"),
    updateProduct
);


// =====================================================
// DELETE PRODUCT (FARMER — OWNER ONLY)
// =====================================================

router.post(
    "/:id/delete",
    requireFarmer,
    validateId("id"),
    deleteProduct
);


// =====================================================
// PRODUCT DETAILS (PUBLIC)
// IMPORTANT: THIS MUST BE LAST
// =====================================================

router.get(
    "/:id",
    validateId("id"),
    showProductDetails
);


module.exports = router;
