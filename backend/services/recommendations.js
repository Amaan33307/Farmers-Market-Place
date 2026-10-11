const Product = require("../models/Product");
const Order = require("../models/Order");

const {
    tokenize,
    jaccard,
    similarity
} = require("./priceInsight");


// =====================================================
// SMART RECOMMENDATIONS — content-based filtering
//
// A buyer's past requests tell us what they like:
// categories, locations and kinds of products.
// Every in-stock product gets a score from that
// "preference profile" and the best ones are shown.
// New buyers (no history) see the most requested
// products instead (popularity).
// =====================================================


async function getBuyerRecommendations(buyerId, limit = 4) {

    const history =
        await Order
            .find({ buyer: buyerId })
            .populate("product", "category location name");


    // Products already requested and still pending are skipped
    const pendingProductIds = new Set(
        history
            .filter((o) => o.status === "pending")
            .map((o) => String(o.product && o.product._id ? o.product._id : o.product))
    );


    const candidates =
        (await Product.find({ quantity: { $gt: 0 } }).sort({ createdAt: -1 }))
            .filter((p) => !pendingProductIds.has(String(p._id)));


    if (candidates.length === 0) return [];


    // ---------- Build preference profile ----------
    const categoryWeight = {};
    const locationWeight = {};
    const words = [];

    history.forEach((order) => {

        // Accepted/completed requests count more
        const weight = ["accepted", "completed"].includes(order.status) ? 2 : 1;

        const category = order.product ? order.product.category : null;
        const location = order.product ? order.product.location : null;

        if (category) categoryWeight[category] = (categoryWeight[category] || 0) + weight;

        if (location) {
            const key = location.toLowerCase();
            locationWeight[key] = (locationWeight[key] || 0) + weight;
        }

        words.push(...tokenize(order.productName));

    });


    const totalWeight =
        Object.values(categoryWeight).reduce((a, b) => a + b, 0) || 1;


    // ---------- Popularity (for new buyers / tie-break) ----------
    const popularity = {};

    (await Order.find({}).select("product")).forEach((order) => {
        const key = String(order.product);
        popularity[key] = (popularity[key] || 0) + 1;
    });

    const maxPopularity = Math.max(1, ...Object.values(popularity));


    const hasHistory = history.length > 0;


    const scored = candidates.map((product) => {

        const categoryScore = (categoryWeight[product.category] || 0) / totalWeight;

        const locationScore = (locationWeight[product.location.toLowerCase()] || 0) / totalWeight;

        const nameScore = jaccard(words, tokenize(product.name));

        const popularityScore = (popularity[String(product._id)] || 0) / maxPopularity;

        const score = hasHistory
            ? 0.45 * categoryScore + 0.20 * locationScore + 0.25 * nameScore + 0.10 * popularityScore
            : popularityScore;


        // Explain WHY it is recommended
        let reason = "New in the marketplace";

        if (hasHistory && nameScore > 0) {
            reason = "Similar to products you requested";
        } else if (hasHistory && categoryScore > 0) {
            reason = `Because you like ${product.category}`;
        } else if (hasHistory && locationScore > 0) {
            reason = `From ${product.location}, where you buy often`;
        } else if (popularityScore > 0) {
            reason = "Popular with other buyers";
        }


        return { product, score, reason };

    });


    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

}


// =====================================================
// SIMILAR PRODUCTS (shown on a product page)
// Uses the same similarity measure as the price model.
// =====================================================

async function getSimilarProducts(product, limit = 3) {

    const candidates =
        await Product.find({
            _id: { $ne: product._id },
            quantity: { $gt: 0 }
        });


    return candidates
        .map((p) => ({ product: p, score: similarity(product, p) }))
        .filter((item) => item.score >= 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.product);

}


module.exports = {
    getBuyerRecommendations,
    getSimilarProducts
};
