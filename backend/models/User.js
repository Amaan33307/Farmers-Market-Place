const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must contain at least 2 characters"],
            maxlength: [50, "Name cannot exceed 50 characters"]
        },

        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
            match: [
                /^[6-9]\d{9}$/,
                "Please enter a valid 10-digit Indian phone number"
            ]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address"
            ]
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must contain at least 6 characters"]
        },

        role: {
            type: String,
            required: [true, "Role is required"],
            enum: {
                values: ["farmer", "buyer"],
                message: "Role must be either farmer or buyer"
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);