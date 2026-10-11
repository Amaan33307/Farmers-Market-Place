const express = require("express");
const router = express.Router();

const Farmer = require("../models/Farmer");

const { isValidId } = require("../utils/helpers");


// =====================================================
// FARMER RECORDS — JSON API
// Mounted at /api/farmers (see server.js).
// Reading is public; creating, updating and deleting
// require a logged-in farmer account.
// The Farmers web page (/farmers) uses registered
// farmer accounts and their products instead.
// =====================================================


// Only allow known fields (prevents unexpected data)
function pickFarmerFields(body) {

    const allowed = ["name", "email", "phone", "location", "crop", "quantity", "price"];

    const data = {};

    allowed.forEach((field) => {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    });

    return data;

}


// For API calls from logged-out users, answer in JSON
function apiRequireFarmer(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({ error: "Login required" });
    }

    if (req.session.role !== "farmer") {
        return res.status(403).json({ error: "Farmers only" });
    }

    next();

}


// POST - Add a new farmer
router.post("/", apiRequireFarmer, async (req, res) => {
    try {
        const farmer = new Farmer(pickFarmerFields(req.body));
        await farmer.save();

        res.status(201).json(farmer);
    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
});

// GET - Get all farmers
router.get("/", async (req, res) => {
    try {
        const farmers = await Farmer.find();

        res.status(200).json(farmers);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// PUT - Update a farmer
router.put("/:id", apiRequireFarmer, async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(404).json({
                error: "Farmer not found"
            });
        }

        const farmer = await Farmer.findByIdAndUpdate(
            req.params.id,
            pickFarmerFields(req.body),
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!farmer) {
            return res.status(404).json({
                error: "Farmer not found"
            });
        }

        res.status(200).json(farmer);

    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
});

// DELETE - Delete a farmer
router.delete("/:id", apiRequireFarmer, async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(404).json({
                error: "Farmer not found"
            });
        }

        const farmer = await Farmer.findByIdAndDelete(req.params.id);

        if (!farmer) {
            return res.status(404).json({
                error: "Farmer not found"
            });
        }

        res.status(200).json({
            message: "Farmer deleted successfully",
            farmer: farmer
        });

    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
});

module.exports = router;
