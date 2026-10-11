const Product = require("../models/Product");


// =====================================================
// AI PRICE INSIGHT — k-Nearest Neighbours (KNN)
//
// Idea: a fair price for a product is close to the
// prices of the most SIMILAR products already listed.
//
// 1. Only products with the SAME UNIT are compared
//    (₹/kg cannot be compared with ₹/litre).
// 2. Every listed product gets a similarity score:
//        name similarity (Jaccard on words) × 0.55
//      + same category                      × 0.30
//      + same location                      × 0.15
// 3. The K most similar products (neighbours) are
//    selected and a similarity-WEIGHTED average of their
//    prices is the predicted fair price.
// 4. The farmer's price is compared with the prediction:
//    within ±15% = fair, otherwise below/above market.
// =====================================================

const K = 5;
const MIN_SIMILARITY = 0.3;
const FAIR_BAND = 0.15;

const WEIGHTS = {
    name: 0.55,
    category: 0.30,
    location: 0.15
};


// Split a product name into simple comparable words
// "Fresh Red Tomatoes" -> ["red", "tomato"]
const STOP_WORDS = new Set([
    "fresh", "organic", "best", "quality", "premium", "new",
    "the", "a", "an", "and", "of", "for", "farm", "pure", "natural"
]);

function tokenize(text = "") {

    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
        .map((word) => {
            // very small "stemmer": tomatoes -> tomato, apples -> apple
            if (word.endsWith("oes")) return word.slice(0, -2);
            if (word.endsWith("ies")) return word.slice(0, -3) + "y";
            if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
            return word;
        });

}


// Jaccard similarity = |A ∩ B| / |A ∪ B|
function jaccard(a, b) {

    const setA = new Set(a);
    const setB = new Set(b);

    if (!setA.size || !setB.size) return 0;

    let common = 0;

    setA.forEach((word) => {
        if (setB.has(word)) common++;
    });

    return common / (setA.size + setB.size - common);

}


function sameLocation(a = "", b = "") {

    const x = String(a).trim().toLowerCase();
    const y = String(b).trim().toLowerCase();

    if (!x || !y) return false;

    return x === y || x.includes(y) || y.includes(x);

}


function similarity(target, product) {

    const nameScore = jaccard(tokenize(target.name), tokenize(product.name));

    const categoryScore =
        target.category && target.category === product.category ? 1 : 0;

    const locationScore =
        sameLocation(target.location, product.location) ? 1 : 0;

    return (
        WEIGHTS.name * nameScore +
        WEIGHTS.category * categoryScore +
        WEIGHTS.location * locationScore
    );

}


function round(value) {

    return Math.round(value * 100) / 100;

}


// =====================================================
// MAIN FUNCTION
// target: { name, category, unit, location, price? }
// options.excludeId: product to leave out (itself)
// =====================================================

async function getPriceInsight(target, options = {}) {

    if (!target || !target.unit || (!target.name && !target.category)) {

        return {
            available: false,
            message: "Enter the product name, category and unit to get a price insight."
        };

    }


    const filter = {
        unit: target.unit,
        price: { $gt: 0 }
    };

    if (options.excludeId) {
        filter._id = { $ne: options.excludeId };
    }


    const candidates =
        await Product
            .find(filter)
            .select("name category unit location price farmerName");


    // Score every candidate and keep the K nearest
    const neighbours =
        candidates
            .map((product) => ({
                product,
                score: similarity(target, product)
            }))
            .filter((item) => item.score >= MIN_SIMILARITY)
            .sort((a, b) => b.score - a.score)
            .slice(0, K);


    if (neighbours.length === 0) {

        return {
            available: false,
            message: `Not enough similar products (sold per ${target.unit}) in the marketplace yet to estimate a price.`
        };

    }


    // Similarity-weighted average price
    const totalWeight =
        neighbours.reduce((sum, n) => sum + n.score, 0);

    const predicted =
        neighbours.reduce((sum, n) => sum + n.product.price * n.score, 0) / totalWeight;


    // Weighted standard deviation -> suggested range
    const variance =
        neighbours.reduce((sum, n) => sum + n.score * Math.pow(n.product.price - predicted, 2), 0) / totalWeight;

    const spread = Math.max(Math.sqrt(variance), predicted * 0.05);

    const averageSimilarity = totalWeight / neighbours.length;


    let confidence = "low";

    if (neighbours.length >= 4 && averageSimilarity >= 0.6) {
        confidence = "high";
    } else if (neighbours.length >= 2 && averageSimilarity >= 0.45) {
        confidence = "medium";
    }


    const result = {
        available: true,
        unit: target.unit,
        predictedPrice: round(predicted),
        range: {
            min: round(Math.max(0.01, predicted - spread)),
            max: round(predicted + spread)
        },
        confidence,
        basedOn: neighbours.length,
        neighbours: neighbours.map((n) => ({
            name: n.product.name,
            price: n.product.price,
            location: n.product.location,
            farmerName: n.product.farmerName,
            similarity: Math.round(n.score * 100)
        })),
        verdict: null
    };


    // Compare the given price with the prediction
    const price = Number(target.price);

    if (Number.isFinite(price) && price > 0) {

        const difference = (price - predicted) / predicted;

        const percent = Math.round(Math.abs(difference) * 100);

        if (difference > FAIR_BAND) {

            result.verdict = {
                level: "above",
                percent,
                text: `About ${percent}% above similar products`
            };

        } else if (difference < -FAIR_BAND) {

            result.verdict = {
                level: "below",
                percent,
                text: `About ${percent}% below similar products`
            };

        } else {

            result.verdict = {
                level: "fair",
                percent,
                text: "Fair price — in line with similar products"
            };

        }

    }


    return result;

}


module.exports = {
    getPriceInsight,
    tokenize,
    jaccard,
    similarity
};
