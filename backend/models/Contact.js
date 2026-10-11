const mongoose = require("mongoose");

// Messages sent from the Contact page form
const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 120
        },

        phone: {
            type: String,
            default: "",
            trim: true,
            maxlength: 20
        },

        subject: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Contact", contactSchema);
