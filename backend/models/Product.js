const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        unit: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            default: ""
        },

        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        farmerName: {
            type: String,
            required: true
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("Product", productSchema);