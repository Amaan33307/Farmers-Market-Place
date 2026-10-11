const Order = require("../models/Order");
const Product = require("../models/Product");
const Notification = require("../models/Notification");

const {
    setFlash,
    renderError
} = require("../utils/helpers");


// =====================================================
// SEND PRODUCT REQUEST (BUYER)
// POST /orders/request/:productId
// =====================================================

const createOrder = async (req, res) => {

    const productPage = `/products/${req.params.productId}`;

    const {
        quantity,
        message = ""
    } = req.body;


    const product =
        await Product.findById(
            req.params.productId
        );


    if (!product) {

        return renderError(res, 404, "Product not found. It may have been removed by the farmer.");

    }


    const requestedQuantity =
        Number(quantity);


    if (
        !Number.isInteger(requestedQuantity) ||
        requestedQuantity < 1
    ) {

        setFlash(req, "danger", "Please enter a valid quantity (a whole number of at least 1).");

        return res.redirect(productPage);

    }


    if (product.quantity < 1) {

        setFlash(req, "warning", "This product is currently out of stock.");

        return res.redirect(productPage);

    }


    if (requestedQuantity > product.quantity) {

        setFlash(
            req,
            "danger",
            `Only ${product.quantity} ${product.unit} available. Please request a smaller quantity.`
        );

        return res.redirect(productPage);

    }


    if (product.farmer.toString() === req.session.userId.toString()) {

        setFlash(req, "danger", "You cannot request your own product.");

        return res.redirect(productPage);

    }


    if (String(message).length > 500) {

        setFlash(req, "danger", "Message cannot exceed 500 characters.");

        return res.redirect(productPage);

    }


    const existingRequest =
        await Order.findOne({
            product: product._id,
            buyer: req.session.userId,
            status: "pending"
        });


    if (existingRequest) {

        setFlash(req, "warning", "You already have a pending request for this product.");

        return res.redirect("/orders/my-requests");

    }


    const order = new Order({

        product: product._id,

        buyer: req.session.userId,

        buyerName: req.session.userName,

        farmer: product.farmer,

        farmerName: product.farmerName,

        productName: product.name,

        quantity: requestedQuantity,

        unit: product.unit,

        price: product.price,

        totalAmount: requestedQuantity * product.price,

        message: String(message).trim()

    });


    await order.save();


    // =================================================
    // NOTIFY FARMER
    // =================================================

    await Notification.create({

        recipient: product.farmer,

        sender: req.session.userId,

        order: order._id,

        title: "New Product Request",

        message:
            `${req.session.userName} requested ${requestedQuantity} ${product.unit} of ${product.name}.`,

        type: "request"

    });


    console.log(
        "✅ Product request created:",
        order._id.toString()
    );


    setFlash(
        req,
        "success",
        `Request sent to ${product.farmerName}. You will be notified when they respond.`
    );

    res.redirect("/orders/my-requests");

};


// =====================================================
// BUYER REQUESTS
// GET /orders/my-requests
// =====================================================

const showBuyerOrders = async (req, res) => {

    const orders =
        await Order
            .find({
                buyer: req.session.userId
            })
            .populate("farmer", "name phone email")
            .sort({
                createdAt: -1
            });


    res.render(
        "my-requests",
        {
            title: "My Requests",
            orders
        }
    );

};


// =====================================================
// FARMER REQUESTS
// GET /orders/farmer-requests
// =====================================================

const showFarmerOrders = async (req, res) => {

    const statusFilter =
        ["pending", "accepted", "rejected", "completed"].includes(req.query.status)
            ? req.query.status
            : "";

    const filter = {
        farmer: req.session.userId
    };

    if (statusFilter) {
        filter.status = statusFilter;
    }


    const orders =
        await Order
            .find(filter)
            .populate("buyer", "name phone email")
            .populate("product", "quantity unit")
            .sort({
                createdAt: -1
            });


    res.render(
        "farmer-requests",
        {
            title: "Product Requests",
            orders,
            statusFilter
        }
    );

};


// =====================================================
// Load a request that belongs to the logged-in farmer.
// =====================================================

async function findFarmerOrder(req, res) {

    const order =
        await Order.findById(req.params.id);


    if (!order) {

        renderError(res, 404, "Request not found.");

        return null;

    }


    if (order.farmer.toString() !== req.session.userId.toString()) {

        renderError(res, 403, "You cannot manage this request.");

        return null;

    }


    return order;

}


// =====================================================
// ACCEPT REQUEST (FARMER)
// POST /orders/:id/accept
//
// 1. Request must be pending (atomic status change, so
//    the same request can never be processed twice).
// 2. Product must still exist with enough quantity
//    (atomic $inc, so stock can never go below 0).
// =====================================================

const acceptOrder = async (req, res) => {

    const order = await findFarmerOrder(req, res);

    if (!order) return;


    if (order.status !== "pending") {

        setFlash(req, "warning", "This request has already been processed.");

        return res.redirect("/orders/farmer-requests");

    }


    // Step 1: claim the request (pending -> accepted)

    const claimed =
        await Order.findOneAndUpdate(
            {
                _id: order._id,
                farmer: req.session.userId,
                status: "pending"
            },
            {
                status: "accepted"
            },
            {
                returnDocument: "after"
            }
        );


    if (!claimed) {

        setFlash(req, "warning", "This request has already been processed.");

        return res.redirect("/orders/farmer-requests");

    }


    // Step 2: reduce stock only if enough is available

    const product =
        await Product.findOneAndUpdate(
            {
                _id: order.product,
                quantity: {
                    $gte: order.quantity
                }
            },
            {
                $inc: {
                    quantity: -order.quantity
                }
            },
            {
                returnDocument: "after"
            }
        );


    if (!product) {

        // Undo step 1
        await Order.updateOne(
            {
                _id: order._id
            },
            {
                status: "pending"
            }
        );

        const exists = await Product.exists({ _id: order.product });

        setFlash(
            req,
            "danger",
            exists
                ? "Not enough quantity available to accept this request. Update your stock or reject the request."
                : "This product no longer exists, so the request cannot be accepted."
        );

        return res.redirect("/orders/farmer-requests");

    }


    // =================================================
    // NOTIFY BUYER
    // =================================================

    await Notification.create({

        recipient: order.buyer,

        sender: req.session.userId,

        order: order._id,

        title: "Request Accepted",

        message:
            `Your request for ${order.quantity} ${order.unit} of ${order.productName} has been accepted by ${order.farmerName}.`,

        type: "accepted"

    });


    console.log(
        "✅ Request accepted:",
        order._id.toString()
    );


    setFlash(
        req,
        "success",
        `Request accepted. ${product.quantity} ${product.unit} of ${product.name} left in stock.`
    );

    res.redirect("/orders/farmer-requests");

};


// =====================================================
// REJECT REQUEST (FARMER)
// POST /orders/:id/reject
// =====================================================

const rejectOrder = async (req, res) => {

    const order = await findFarmerOrder(req, res);

    if (!order) return;


    const rejected =
        await Order.findOneAndUpdate(
            {
                _id: order._id,
                farmer: req.session.userId,
                status: "pending"
            },
            {
                status: "rejected"
            },
            {
                returnDocument: "after"
            }
        );


    if (!rejected) {

        setFlash(req, "warning", "This request has already been processed.");

        return res.redirect("/orders/farmer-requests");

    }


    // =================================================
    // NOTIFY BUYER
    // =================================================

    await Notification.create({

        recipient: order.buyer,

        sender: req.session.userId,

        order: order._id,

        title: "Request Rejected",

        message:
            `Your request for ${order.productName} has been rejected by ${order.farmerName}.`,

        type: "rejected"

    });


    console.log(
        "❌ Request rejected:",
        order._id.toString()
    );


    setFlash(req, "info", "Request rejected. The buyer has been notified.");

    res.redirect("/orders/farmer-requests");

};


module.exports = {

    createOrder,

    showBuyerOrders,

    showFarmerOrders,

    acceptOrder,

    rejectOrder

};
