const express = require("express");

const router = express.Router();

const {
    priceInsight,
    writeDescription,
    shoppingAssistant
} = require("../controller/aiController");


// =====================================================
// AI ROUTES (JSON) — mounted at /ai
// These are called from the browser with fetch(), so
// they answer with JSON errors instead of redirects.
// =====================================================

function apiLogin(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({ error: "Please login to use the AI assistant." });
    }

    next();

}

function apiFarmer(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({ error: "Please login first." });
    }

    if (req.session.role !== "farmer") {
        return res.status(403).json({ error: "Only farmers can use this feature." });
    }

    next();

}


// AI price insight (KNN model, no API key needed)
router.get("/price-insight", apiFarmer, priceInsight);

// AI description writer (Claude API)
router.post("/description", apiFarmer, writeDescription);

// AI shopping assistant (Claude API)
router.post("/assistant", apiLogin, shoppingAssistant);


module.exports = router;
