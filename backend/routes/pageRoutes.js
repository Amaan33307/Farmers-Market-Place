const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Contact = require("../models/Contact");

const { requireLogin } = require("../middleware/auth");
const { getBuyerRecommendations } = require("../services/recommendations");
const { setFlash, escapeRegex } = require("../utils/helpers");


// =====================================================
// HOME
// Real numbers from MongoDB instead of fixed values.
// =====================================================

router.get("/", async (req, res) => {

    const [farmerCount, buyerCount, productCount, acceptedCount] =
        await Promise.all([
            User.countDocuments({ role: "farmer" }),
            User.countDocuments({ role: "buyer" }),
            Product.countDocuments({ quantity: { $gt: 0 } }),
            Order.countDocuments({ status: { $in: ["accepted", "completed"] } })
        ]);


    const latestProducts =
        await Product
            .find({ quantity: { $gt: 0 } })
            .sort({ createdAt: -1 })
            .limit(4);


    res.render("home", {
        title: null,
        stats: {
            farmerCount,
            buyerCount,
            productCount,
            acceptedCount
        },
        latestProducts
    });

});


// =====================================================
// MARKETPLACE
// =====================================================

router.get("/marketplace", (req, res) => {

    // Keep any search filters in the URL
    const query = new URLSearchParams(req.query).toString();

    res.redirect("/products/marketplace" + (query ? "?" + query : ""));

});


// =====================================================
// FARMERS
// Registered farmer accounts + their product summary.
// Supports ?q= search by farmer name or location.
// =====================================================

router.get("/farmers", async (req, res) => {

    const q = String(req.query.q || "").trim();


    const farmers =
        await User
            .find({ role: "farmer" })
            .select("name createdAt")
            .sort({ createdAt: 1 });


    const products =
        await Product
            .find({})
            .select("farmer category location quantity");


    // Group products by farmer
    const summary = {};

    products.forEach((product) => {

        const key = String(product.farmer);

        if (!summary[key]) {
            summary[key] = {
                productCount: 0,
                inStock: 0,
                categories: new Set(),
                locations: new Set()
            };
        }

        summary[key].productCount++;

        if (product.quantity > 0) summary[key].inStock++;

        summary[key].categories.add(product.category);

        summary[key].locations.add(product.location);

    });


    let farmerCards = farmers.map((farmer) => {

        const s = summary[String(farmer._id)] || {
            productCount: 0,
            inStock: 0,
            categories: new Set(),
            locations: new Set()
        };

        return {
            id: String(farmer._id),
            name: farmer.name,
            joined: farmer.createdAt,
            productCount: s.productCount,
            inStock: s.inStock,
            categories: [...s.categories],
            locations: [...s.locations]
        };

    });


    // Search by name or product location
    if (q) {

        const pattern = new RegExp(escapeRegex(q), "i");

        farmerCards = farmerCards.filter((farmer) =>
            pattern.test(farmer.name) ||
            farmer.locations.some((loc) => pattern.test(loc))
        );

    }


    // Farmers with products first
    farmerCards.sort((a, b) => b.productCount - a.productCount);


    const allLocations = new Set();

    products.forEach((product) => allLocations.add(product.location.toLowerCase()));


    const acceptedCount =
        await Order.countDocuments({
            status: { $in: ["accepted", "completed"] }
        });


    res.render("farmers", {
        title: "Farmers",
        farmers: farmerCards,
        q,
        stats: {
            farmerCount: farmers.length,
            productCount: products.length,
            locationCount: allLocations.size,
            acceptedCount
        }
    });

});


// =====================================================
// ABOUT
// =====================================================

router.get("/about", (req, res) => {

    res.render("about", {
        title: "About"
    });

});


// =====================================================
// CONTACT
// =====================================================

router.get("/contact", (req, res) => {

    const old = req.session.oldInput || {};

    delete req.session.oldInput;

    res.render("contact", {
        title: "Contact",
        old
    });

});


router.post("/contact", async (req, res) => {

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const phone = String(req.body.phone || "").trim();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();


    let error = null;

    if (!name || !email || !message) {
        error = "Please fill in your name, email and message.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        error = "Please enter a valid email address.";
    } else if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        error = "Please enter a valid 10-digit phone number or leave it empty.";
    } else if (message.length < 10) {
        error = "Message should be at least 10 characters long.";
    } else if (message.length > 2000 || name.length > 60) {
        error = "Your message is too long.";
    }


    if (error) {

        req.session.oldInput = { name, email, phone, subject, message };

        setFlash(req, "danger", error);

        return res.redirect("/contact");

    }


    await Contact.create({
        name,
        email,
        phone,
        subject,
        message,
        user: req.session.userId || null
    });


    setFlash(
        req,
        "success",
        "Thank you for contacting us! We have received your message."
    );

    res.redirect("/contact");

});


// =====================================================
// DASHBOARD (LOGGED-IN USERS)
// =====================================================

router.get("/dashboard", requireLogin, async (req, res) => {

    const userId = req.session.userId;

    const role = req.session.role;

    const ownerField = role === "farmer" ? "farmer" : "buyer";


    // All requests for statistics
    const allOrders =
        await Order.find({
            [ownerField]: userId
        }).sort({
            createdAt: -1
        });


    const orders = allOrders.slice(0, 5);


    // =================================================
    // STATISTICS
    // =================================================

    const totalOrders = allOrders.length;

    const pendingOrders =
        allOrders.filter((o) => o.status === "pending").length;

    // "completed" = accepted and paid
    const acceptedOrders =
        allOrders.filter((o) => ["accepted", "completed"].includes(o.status)).length;

    const rejectedOrders =
        allOrders.filter((o) => o.status === "rejected").length;

    const completedOrders =
        allOrders.filter((o) => o.status === "completed").length;


    // Value of accepted/completed requests only
    const totalValue =
        allOrders
            .filter((o) => ["accepted", "completed"].includes(o.status))
            .reduce((total, o) => total + (o.totalAmount || 0), 0);


    // Farmer: product summary
    let productStats = null;

    if (role === "farmer") {

        const products =
            await Product.find({ farmer: userId }).select("name quantity unit");

        productStats = {
            total: products.length,
            outOfStock: products.filter((p) => p.quantity === 0).length,
            lowStock: products.filter((p) => p.quantity > 0 && p.quantity <= 5)
        };

    }


    res.render(
        "dashboard",
        {
            title: "Dashboard",
            totalOrders,
            pendingOrders,
            acceptedOrders,
            rejectedOrders,
            completedOrders,
            totalValue,
            orders,
            productStats,
            recommendations:
                role === "buyer"
                    ? await getBuyerRecommendations(userId, 4)
                    : []
        }
    );

});


module.exports = router;
