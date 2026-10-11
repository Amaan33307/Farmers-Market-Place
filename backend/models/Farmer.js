const mongoose = require("mongoose");

const farmerSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    location: String,
    crop: String,
    quantity: Number,
    price: Number
});

module.exports = mongoose.model("Farmer", farmerSchema);