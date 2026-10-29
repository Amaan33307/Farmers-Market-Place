// =====================================================
// PREPARE DEMO DATA (for project presentation)
//
//   npm run demo-data
//
// 1. Saves a full backup of the database to backups/
// 2. Removes broken / junk test listings (huge quantity,
//    gibberish text, impossible prices) and their
//    requests + notifications
// 3. Adds clean demo farmers, products (with photos),
//    buyers, requests in every status, notifications
//    and contact messages
//
// Safe to run more than once: demo records are updated,
// not duplicated. Real user accounts are never deleted.
// Demo password for every demo account: demo1234
// =====================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../backend/models/User");
const Product = require("../backend/models/Product");
const Order = require("../backend/models/Order");
const Notification = require("../backend/models/Notification");
const Contact = require("../backend/models/Contact");
const { PRODUCT_CATEGORIES, PRODUCT_UNITS } = require("../backend/config/constants");

const PASSWORD = "demo1234";
const T = "https://thumb.wikimedia.org/wikipedia/commons/thumb";
const IMG = {
    tomato: `${T}/8/89/Tomato_je.jpg/500px-Tomato_je.jpg`,
    onion: `${T}/a/a2/Mixed_onions.jpg/500px-Mixed_onions.jpg`,
    potato: `${T}/a/ab/Patates.jpg/500px-Patates.jpg`,
    wheat: `${T}/b/b4/Wheat_close-up.JPG/500px-Wheat_close-up.JPG`,
    grains: `${T}/1/16/Egyptian_Grains.jpg/500px-Egyptian_Grains.jpg`,
    dal: `${T}/4/46/Split_pigeon_peas.jpg/500px-Split_pigeon_peas.jpg`,
    dal2: `${T}/0/08/Pigeon_pea_%28Red_gram%2C_Thuvarai_in_Tamil%29_01.jpg/500px-Pigeon_pea_%28Red_gram%2C_Thuvarai_in_Tamil%29_01.jpg`,
    milk: `${T}/f/f2/Milk-2474993_1920.jpg/500px-Milk-2474993_1920.jpg`,
    milk2: `${T}/8/80/Bowl_milk_glass.jpg/500px-Bowl_milk_glass.jpg`,
    banana: `${T}/a/a9/Bunch_of_bananas_on_sale.jpg/500px-Bunch_of_bananas_on_sale.jpg`,
    banana2: `${T}/4/45/Banana_bunch_in_a_banana_farm_at_Chinawal.jpg/500px-Banana_bunch_in_a_banana_farm_at_Chinawal.jpg`,
    jaggery: `${T}/0/09/Sa-indian-gud.jpg/500px-Sa-indian-gud.jpg`,
    jaggery2: `${T}/7/78/Jaggery_cubes.jpg/500px-Jaggery_cubes.jpg`,
};

// ---------- demo people ----------
const FARMERS = [
    { key: "ramesh", name: "Ramesh Patil", email: "ramesh.patil.demo@example.com", phone: "9822001001" },
    { key: "sunita", name: "Sunita Jadhav", email: "sunita.jadhav.demo@example.com", phone: "9822001002" },
    { key: "kiran", name: "Kiran More", email: "kiran.more.demo@example.com", phone: "9822001003" },
    { key: "mahesh", name: "Mahesh Shinde", email: "mahesh.shinde.demo@example.com", phone: "9822001004" },
    { key: "anita", name: "Anita Deshmukh", email: "anita.deshmukh.demo@example.com", phone: "9822001005" },
    { key: "vijay", name: "Vijay Chaudhari", email: "vijay.chaudhari.demo@example.com", phone: "9822001006" },
];
const BUYERS = [
    { key: "priya", name: "Priya Sharma", email: "priya.sharma.demo@example.com", phone: "9833002001" },
    { key: "rahul", name: "Rahul Mehta", email: "rahul.mehta.demo@example.com", phone: "9833002002" },
];

// ---------- new demo products (3 similar items per type so the AI price check has data) ----------
// [farmer, name, category, price, quantity, unit, location, image, description]
const PRODUCTS = [
    ["mahesh", "Agra Potatoes", "Vegetables", 22, 800, "kg", "Latur", IMG.potato, "Clean, medium-sized potatoes, good for daily cooking and snacks. Stored in a cool, dry place."],
    ["anita", "Fresh Potatoes", "Vegetables", 25, 500, "kg", "Pune", IMG.potato, "Freshly harvested potatoes with thin skin. Suitable for restaurants and home kitchens."],
    ["ramesh", "Pahadi Potatoes", "Vegetables", 28, 300, "kg", "Nashik", IMG.potato, "Firm potatoes with a good taste, ideal for curries, fries and parathas."],

    ["anita", "Sharbati Wheat", "Grains", 38, 1200, "kg", "Indore", IMG.wheat, "Premium Sharbati wheat with golden grains. Makes soft and tasty rotis."],
    ["mahesh", "Lokwan Wheat", "Grains", 32, 1500, "kg", "Latur", IMG.wheat, "Clean Lokwan wheat, sun-dried and ready for milling."],
    ["vijay", "Desi Wheat", "Grains", 30, 900, "kg", "Jalgaon", IMG.grains, "Locally grown wheat, good value for flour mills and households."],

    ["mahesh", "Toor Dal", "Pulses", 115, 400, "kg", "Latur", IMG.dal, "Cleaned and polished toor dal from Latur, cooks quickly and tastes rich."],
    ["sunita", "Organic Toor Dal", "Pulses", 140, 150, "kg", "Pune", IMG.dal, "Organically grown toor dal without chemicals. Unpolished and full of nutrition."],
    ["vijay", "Unpolished Toor Dal", "Pulses", 125, 250, "kg", "Jalgaon", IMG.dal2, "Natural unpolished toor dal straight from the farm, ideal for daily dal."],

    ["sunita", "Fresh Cow Milk", "Dairy", 60, 200, "litre", "Pune", IMG.milk, "Pure cow milk collected every morning. Delivered fresh, no water or preservatives."],
    ["kiran", "Desi Cow Milk", "Dairy", 70, 120, "litre", "Satara", IMG.milk2, "Milk from desi cows fed on green fodder. Thick and creamy."],
    ["vijay", "Buffalo Milk", "Dairy", 75, 150, "litre", "Jalgaon", IMG.milk, "Rich buffalo milk with high fat, good for tea, curd and sweets."],

    ["vijay", "Jalgaon Bananas", "Fruits", 40, 600, "kg", "Jalgaon", IMG.banana2, "Famous Jalgaon bananas, sweet and naturally ripened."],
    ["kiran", "Elaichi Bananas", "Fruits", 60, 200, "kg", "Ratnagiri", IMG.banana, "Small, sweet elaichi bananas, perfect for fruit stalls and shops."],
    ["anita", "Robusta Bananas", "Fruits", 35, 400, "kg", "Pune", IMG.banana, "Fresh robusta bananas at a good price for bulk buyers."],

    ["ramesh", "Organic Jaggery", "Other", 70, 300, "kg", "Kolhapur", IMG.jaggery, "Chemical-free jaggery made from fresh sugarcane juice in Kolhapur."],
    ["sunita", "Jaggery Cubes", "Other", 85, 100, "kg", "Kolhapur", IMG.jaggery2, "Easy-to-use jaggery cubes, great for tea and sweets."],
];

// ---------- demo requests: [buyer, product name, qty, status, payment method, message] ----------
const ORDERS = [
    ["priya", "Red Tomatoes", 20, "completed", "upi", "For our restaurant kitchen, please deliver in the morning."],
    ["priya", "Fresh Onions", 30, "accepted", null, "Need good quality onions every week."],
    ["priya", "Toor Dal", 10, "pending", null, "Please confirm if the dal is cleaned."],
    ["priya", "Fresh Cow Milk", 20, "pending", null, "Daily morning delivery needed."],
    ["priya", "Sharbati Wheat", 50, "rejected", null, "Can you deliver to Pune?"],
    ["rahul", "Jalgaon Bananas", 40, "completed", "cod", "For our grocery shop in Mumbai."],
    ["rahul", "Premium Basmati Rice", 25, "pending", null, "Need for festival season stock."],
    ["rahul", "Organic Jaggery", 15, "accepted", null, "Please pack in 1 kg packets if possible."],
];

const CONTACTS = [
    ["Suresh Pawar", "suresh.pawar@example.com", "9876500011", "Joining as a farmer", "I grow onions in Lasalgaon. How can I register and list my produce?"],
    ["Neha Joshi", "neha.joshi@example.com", "9876500012", "Bulk order", "We run a cloud kitchen in Pune. Can we place weekly orders for vegetables?"],
];

// ---------- junk detection (only for listings not owned by demo farmers) ----------
function looksLikeJunk(p) {
    const text = `${p.name || ""} ${p.description || ""} ${p.location || ""}`;
    const reasons = [];
    if (!Number.isFinite(p.quantity) || p.quantity > 100000) reasons.push("unrealistic quantity");
    if (!Number.isFinite(p.price) || p.price <= 0 || p.price > 100000) reasons.push("impossible price");
    if (/[a-z]{3,}\d{2,}[a-z\d]*/i.test(text) || /[bcdfghjklmnpqrstvwxz]{6,}/i.test(text)) reasons.push("gibberish text");
    if (String(p.name || "").trim().length < 3) reasons.push("name too short");
    if (!PRODUCT_CATEGORIES.includes(p.category)) reasons.push("invalid category");
    if (!PRODUCT_UNITS.includes(p.unit)) reasons.push("invalid unit");
    if (/new york|london|usa\b/i.test(p.location || "")) reasons.push("location outside India");
    return reasons;
}

async function upsertUser(person, role, hash) {
    let user = await User.findOne({ email: person.email });
    if (!user) user = new User({ email: person.email });
    user.name = person.name;
    user.phone = person.phone;
    user.role = role;
    user.password = hash;
    await user.save();
    return user;
}

async function main() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const db = mongoose.connection.db;
    console.log("✅ Connected to MongoDB\n");

    // ---------- 1. BACKUP ----------
    const backup = {};
    for (const name of ["users", "products", "orders", "notifications", "contacts", "farmers"]) {
        backup[name] = await db.collection(name).find({}).toArray();
    }
    const dir = path.join(__dirname, "..", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 1));
    console.log(`💾 Backup saved: backups/${path.basename(file)}`);
    console.log(`   (${Object.entries(backup).map(([k, v]) => `${v.length} ${k}`).join(", ")})\n`);

    // ---------- 2. PEOPLE ----------
    const hash = await bcrypt.hash(PASSWORD, 10);
    const F = {}, B = {};
    for (const f of FARMERS) F[f.key] = await upsertUser(f, "farmer", hash);
    for (const b of BUYERS) B[b.key] = await upsertUser(b, "buyer", hash);
    const demoFarmerIds = new Set(Object.values(F).map((u) => String(u._id)));
    console.log(`👩‍🌾 Demo farmers ready: ${FARMERS.map((f) => f.name).join(", ")}`);
    console.log(`🛒 Demo buyers ready: ${BUYERS.map((b) => b.name).join(", ")}\n`);

    // ---------- 3. REMOVE JUNK LISTINGS ----------
    const all = await Product.find({});
    const junk = all.filter((p) => !demoFarmerIds.has(String(p.farmer)) && looksLikeJunk(p).length);
    if (junk.length) {
        console.log("🧹 Removing junk listings:");
        for (const p of junk) console.log(`   - "${p.name}" (${p.farmerName || "?"}) → ${looksLikeJunk(p).join(", ")}`);
        const ids = junk.map((p) => p._id);
        const orders = await Order.find({ product: { $in: ids } }).select("_id");
        await Notification.deleteMany({ order: { $in: orders.map((o) => o._id) } });
        await Order.deleteMany({ product: { $in: ids } });
        await Product.deleteMany({ _id: { $in: ids } });
        console.log(`   Removed ${junk.length} listing(s) and ${orders.length} related request(s).\n`);
    } else {
        console.log("🧹 No junk listings found.\n");
    }
    // Products with no farmer account left
    const farmerIds = new Set((await User.find({ role: "farmer" }).select("_id")).map((u) => String(u._id)));
    const orphans = (await Product.find({})).filter((p) => !farmerIds.has(String(p.farmer)));
    if (orphans.length) {
        await Product.deleteMany({ _id: { $in: orphans.map((p) => p._id) } });
        console.log(`🧹 Removed ${orphans.length} listing(s) whose farmer account no longer exists.\n`);
    }

    // ---------- 4. PRODUCTS ----------
    // first remove old demo requests (and give their stock back)
    const demoBuyerIds = Object.values(B).map((u) => u._id);
    const oldOrders = await Order.find({ buyer: { $in: demoBuyerIds } });
    // give back stock taken by old demo requests, then start fresh
    for (const o of oldOrders) {
        if (["accepted", "completed"].includes(o.status)) await Product.updateOne({ _id: o.product }, { $inc: { quantity: o.quantity } });
    }
    await Notification.deleteMany({ order: { $in: oldOrders.map((o) => o._id) } });
    await Order.deleteMany({ buyer: { $in: demoBuyerIds } });

    let added = 0, updated = 0;
    for (const [fk, name, category, price, quantity, unit, location, image, description] of PRODUCTS) {
        const farmer = F[fk];
        const existing = await Product.findOne({ farmer: farmer._id, name });
        const doc = existing || new Product({ farmer: farmer._id, name });
        Object.assign(doc, { category, price, quantity, unit, location, image, description, farmerName: farmer.name });
        await doc.save();
        existing ? updated++ : added++;
    }
    console.log(`🌾 Demo products: ${added} added, ${updated} refreshed.`);
    // give every demo product a photo if it has none
    const fallback = { tomato: IMG.tomato, onion: IMG.onion, potato: IMG.potato, wheat: IMG.wheat, dal: IMG.dal, milk: IMG.milk, banana: IMG.banana, jaggery: IMG.jaggery };
    for (const p of await Product.find({ $or: [{ image: "" }, { image: null }, { image: { $exists: false } }] })) {
        const key = Object.keys(fallback).find((k) => p.name.toLowerCase().includes(k));
        if (key) { p.image = fallback[key]; await p.save(); }
    }

    // ---------- 5. REQUESTS + NOTIFICATIONS ----------

    let made = 0;
    const DAY = 24 * 60 * 60 * 1000;
    for (const [i, [bk, productName, qty, status, method, message]] of ORDERS.entries()) {
        const buyer = B[bk];
        const product = await Product.findOne({ name: productName, farmer: { $in: [...demoFarmerIds] } });
        if (!product) { console.log(`   ⚠️  Skipped request for "${productName}" (product not found)`); continue; }
        const farmer = await User.findById(product.farmer);
        const when = new Date(Date.now() - (ORDERS.length - i) * DAY);
        const order = await Order.create({
            product: product._id, buyer: buyer._id, buyerName: buyer.name,
            farmer: farmer._id, farmerName: farmer.name, productName: product.name,
            quantity: qty, unit: product.unit, price: product.price, totalAmount: product.price * qty,
            message, status,
            paymentStatus: status === "completed" ? "paid" : "pending",
            paymentMethod: status === "completed" ? method : "none",
            paymentId: status === "completed" ? `PAY-DEMO-${1000 + i}` : undefined,
            paidAt: status === "completed" ? when : undefined,
            createdAt: when, updatedAt: when,
        });
        if (["accepted", "completed"].includes(status)) await Product.updateOne({ _id: product._id }, { $inc: { quantity: -qty } });

        const notes = [{ recipient: farmer._id, sender: buyer._id, title: "New Product Request", type: "request",
            message: `${buyer.name} requested ${qty} ${product.unit} of ${product.name}.`, read: status !== "pending" }];
        if (status === "accepted" || status === "completed") notes.push({ recipient: buyer._id, sender: farmer._id, title: "Request Accepted", type: "accepted",
            message: `Your request for ${qty} ${product.unit} of ${product.name} has been accepted by ${farmer.name}.`, read: status === "completed" });
        if (status === "rejected") notes.push({ recipient: buyer._id, sender: farmer._id, title: "Request Rejected", type: "rejected",
            message: `Your request for ${qty} ${product.unit} of ${product.name} was rejected by ${farmer.name}.`, read: false });
        for (const n of notes) await Notification.create({ ...n, order: order._id });
        made++;
    }
    console.log(`📦 Demo requests created: ${made} (pending, accepted, rejected and completed)\n`);

    // ---------- 6. CONTACT MESSAGES ----------
    for (const [name, email, phone, subject, message] of CONTACTS) {
        await Contact.updateOne({ email, subject }, { $set: { name, email, phone, subject, message } }, { upsert: true });
    }

    // ---------- SUMMARY ----------
    const counts = {};
    for (const c of PRODUCT_CATEGORIES) counts[c] = await Product.countDocuments({ category: c });
    console.log("📊 Products per category:", Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "));
    console.log(`   Total: ${await Product.countDocuments()} products, ${await User.countDocuments({ role: "farmer" })} farmers, ${await User.countDocuments({ role: "buyer" })} buyers, ${await Order.countDocuments()} requests\n`);
    console.log("🔑 Demo logins (password for all: demo1234)");
    console.log("   Farmer: ramesh.patil.demo@example.com");
    console.log("   Buyer:  priya.sharma.demo@example.com\n");
    console.log("✅ Demo data is ready.");
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("❌ Failed:", String(error.message).replace(/mongodb(\+srv)?:\/\/\S+/g, "<connection string>"));
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
