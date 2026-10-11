const express = require("express");

const router = express.Router();

const {
    createOrder,
    showBuyerOrders,
    showFarmerOrders,
    acceptOrder,
    rejectOrder
} = require("../controller/orderController");

const {
    requireBuyer,
    requireFarmer,
    validateId
} = require("../middleware/auth");


// =====================================================
// CREATE PRODUCT REQUEST (BUYER)
// =====================================================

router.post(
    "/request/:productId",
    requireBuyer,
    validateId("productId"),
    createOrder
);


// =====================================================
// BUYER REQUESTS
// =====================================================

router.get(
    "/my-requests",
    requireBuyer,
    showBuyerOrders
);


// =====================================================
// FARMER REQUESTS
// =====================================================

router.get(
    "/farmer-requests",
    requireFarmer,
    showFarmerOrders
);


// =====================================================
// ACCEPT / REJECT (FARMER)
// =====================================================

router.post(
    "/:id/accept",
    requireFarmer,
    validateId("id"),
    acceptOrder
);

router.post(
    "/:id/reject",
    requireFarmer,
    validateId("id"),
    rejectOrder
);


module.exports = router;
