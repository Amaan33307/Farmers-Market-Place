const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        buyerName: {
            type: String,
            required: true
        },

        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        farmerName: {
            type: String,
            required: true
        },

        productName: {
            type: String,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        unit: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        message: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "completed"
            ],
            default: "pending"
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "paid",
                "failed"
            ],
            default: "pending"
        },

        paymentMethod: {
            type: String,
            enum: [
                "upi",
                "card",
                "cod",
                "none"
            ],
            default: "none"
        },

        paymentId: {
            type: String,
            default: ""
        },

        paidAt: {
            type: Date,
            default: null
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);