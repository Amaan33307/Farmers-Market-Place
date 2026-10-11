const express = require("express");

const router = express.Router();

const Order = require("../models/Order");
const Notification = require("../models/Notification");

const {
    requireBuyer,
    validateId
} = require("../middleware/auth");

const {
    setFlash,
    renderError
} = require("../utils/helpers");


// =====================================================
// DEMO PAYMENT
// After a farmer accepts a request, the buyer can mark
// it as paid. No real money is processed — this is a
// simulated payment step for the project demo.
// =====================================================


// Load an order that belongs to the logged-in buyer
async function findBuyerOrder(req, res) {

    const order =
        await Order.findById(
            req.params.id
        );


    if (!order) {

        renderError(res, 404, "Order not found.");

        return null;

    }


    if (order.buyer.toString() !== req.session.userId.toString()) {

        renderError(res, 403, "You cannot access this payment.");

        return null;

    }


    return order;

}


// =====================================================
// PAYMENT PAGE
// GET /payment/:id
// =====================================================

router.get(
    "/:id",
    requireBuyer,
    validateId("id"),
    async (req, res) => {

        const order = await findBuyerOrder(req, res);

        if (!order) return;


        if (order.paymentStatus === "paid") {

            return res.redirect(`/payment/${order._id}/success`);

        }


        if (order.status !== "accepted") {

            setFlash(req, "warning", "Payment is available only after the farmer accepts your request.");

            return res.redirect("/orders/my-requests");

        }


        res.render(
            "payment",
            {
                title: "Payment",
                order
            }
        );

    }
);


// =====================================================
// PROCESS PAYMENT
// POST /payment/:id/pay
// =====================================================

router.post(
    "/:id/pay",
    requireBuyer,
    validateId("id"),
    async (req, res) => {

        const {
            paymentMethod
        } = req.body;


        const order = await findBuyerOrder(req, res);

        if (!order) return;


        if (order.paymentStatus === "paid") {

            return res.redirect(`/payment/${order._id}/success`);

        }


        if (order.status !== "accepted") {

            setFlash(req, "warning", "Order must be accepted before payment.");

            return res.redirect("/orders/my-requests");

        }


        if (
            ![
                "upi",
                "card",
                "cod"
            ].includes(paymentMethod)
        ) {

            setFlash(req, "danger", "Please select a valid payment method.");

            return res.redirect(`/payment/${order._id}`);

        }


        order.paymentMethod =
            paymentMethod;

        order.paymentStatus =
            "paid";

        order.paymentId =
            "PAY-" +
            Date.now();

        order.paidAt =
            new Date();

        order.status =
            "completed";


        await order.save();


        await Notification.create({
            recipient: order.farmer,
            sender: req.session.userId,
            order: order._id,
            title: "Payment Received",
            message: `${order.buyerName} completed payment of ₹${order.totalAmount} for ${order.productName}.`,
            type: "general"
        });


        console.log(
            "✅ Payment successful:",
            order.paymentId
        );


        res.redirect(
            `/payment/${order._id}/success`
        );

    }
);


// =====================================================
// PAYMENT SUCCESS
// GET /payment/:id/success
// =====================================================

router.get(
    "/:id/success",
    requireBuyer,
    validateId("id"),
    async (req, res) => {

        const order = await findBuyerOrder(req, res);

        if (!order) return;


        if (order.paymentStatus !== "paid") {

            return res.redirect(`/payment/${order._id}`);

        }


        res.render(
            "payment-success",
            {
                title: "Payment Successful",
                order
            }
        );

    }
);


module.exports = router;
