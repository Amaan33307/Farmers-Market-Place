const Product = require("../models/Product");

const { getPriceInsight } = require("../services/priceInsight");
const aiAssistant = require("../services/aiAssistant");

const {
    PRODUCT_CATEGORIES,
    PRODUCT_UNITS
} = require("../config/constants");

const { isValidId } = require("../utils/helpers");


// =====================================================
// Simple rate limit for the paid LLM API:
// max 10 AI requests per minute per session.
// =====================================================

function allowAiCall(req) {

    const now = Date.now();

    const recent =
        (req.session.aiCalls || []).filter((time) => now - time < 60 * 1000);

    if (recent.length >= 10) {
        req.session.aiCalls = recent;
        return false;
    }

    recent.push(now);

    req.session.aiCalls = recent;

    return true;

}


// =====================================================
// AI PRICE INSIGHT (FARMER)
// GET /ai/price-insight?name=&category=&unit=&location=&price=&exclude=
// =====================================================

const priceInsight = async (req, res) => {

    const unit = String(req.query.unit || "");
    const category = String(req.query.category || "");

    if (!PRODUCT_UNITS.includes(unit)) {
        return res.status(400).json({ available: false, message: "Please select a unit first." });
    }

    if (category && !PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({ available: false, message: "Please select a valid category." });
    }


    const exclude = String(req.query.exclude || "");


    const insight = await getPriceInsight(
        {
            name: String(req.query.name || "").slice(0, 100),
            category,
            unit,
            location: String(req.query.location || "").slice(0, 80),
            price: req.query.price
        },
        {
            excludeId: isValidId(exclude) ? exclude : null
        }
    );


    res.json(insight);

};


// =====================================================
// AI DESCRIPTION WRITER (FARMER, needs API key)
// POST /ai/description  { name, category, unit, location, notes }
// =====================================================

const writeDescription = async (req, res) => {

    if (!aiAssistant.isEnabled()) {
        return res.status(503).json({ error: "AI assistant is not configured on this server." });
    }


    const { name = "", category = "", unit = "", location = "", notes = "" } = req.body || {};

    if (!String(name).trim() || !PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Enter the product name and category first." });
    }


    if (!allowAiCall(req)) {
        return res.status(429).json({ error: "Too many AI requests. Please wait a minute." });
    }


    try {

        const description =
            await aiAssistant.generateDescription({ name, category, unit, location, notes });

        res.json({ description });

    } catch (error) {

        console.error("❌ AI Description Error:", error.message);

        res.status(502).json({ error: "The AI assistant could not write a description right now." });

    }

};


// =====================================================
// AI SHOPPING ASSISTANT (LOGGED-IN USERS, needs API key)
// POST /ai/assistant  { query }
// =====================================================

const shoppingAssistant = async (req, res) => {

    if (!aiAssistant.isEnabled()) {
        return res.status(503).json({ error: "AI assistant is not configured on this server." });
    }


    const query = String((req.body && req.body.query) || "").trim();

    if (query.length < 3 || query.length > 300) {
        return res.status(400).json({ error: "Please describe what you need (3–300 characters)." });
    }


    if (!allowAiCall(req)) {
        return res.status(429).json({ error: "Too many AI requests. Please wait a minute." });
    }


    try {

        const products =
            await Product
                .find({ quantity: { $gt: 0 } })
                .sort({ createdAt: -1 })
                .limit(60);

        const result = await aiAssistant.recommendProducts(query, products);

        res.json(result);

    } catch (error) {

        console.error("❌ AI Assistant Error:", error.message);

        res.status(502).json({ error: "The AI assistant is not available right now. Please try again." });

    }

};


module.exports = {
    priceInsight,
    writeDescription,
    shoppingAssistant
};
