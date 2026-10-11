// =====================================================
// ONE-TIME DATA FIX
// Adds a product photo to every product that has no
// image (or a broken image link), based on the product
// name. Also fills a missing farmer name and fixes the
// capitalisation of the category (e.g. "fruits" -> "Fruits").
//
// Run from the project folder:   npm run fix-images
// =====================================================

require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../backend/models/Product");
const User = require("../backend/models/User");
const { PRODUCT_CATEGORIES } = require("../backend/config/constants");

const W = "https://upload.wikimedia.org/wikipedia/commons/thumb";

// keyword in product name -> free image (Wikimedia Commons)
const IMAGES = [
    ["mango", `${W}/7/74/Mangos_-_single_and_halved.jpg/500px-Mangos_-_single_and_halved.jpg`],
    ["hapus", `${W}/7/74/Mangos_-_single_and_halved.jpg/500px-Mangos_-_single_and_halved.jpg`],
    ["carrot", `${W}/a/a2/Vegetable-Carrot-Bundle-wStalks.jpg/500px-Vegetable-Carrot-Bundle-wStalks.jpg`],
    ["tomato", `${W}/8/89/Tomato_je.jpg/500px-Tomato_je.jpg`],
    ["onion", `${W}/a/a2/Mixed_onions.jpg/500px-Mixed_onions.jpg`],
    ["potato", `${W}/a/ab/Patates.jpg/500px-Patates.jpg`],
    ["rice", `${W}/0/07/Khyma_and_Basmati_rice.jpg/500px-Khyma_and_Basmati_rice.jpg`],
    ["basmati", `${W}/0/07/Khyma_and_Basmati_rice.jpg/500px-Khyma_and_Basmati_rice.jpg`]
];

// Image hosts that block their pictures on other websites
const BROKEN_HOSTS = ["devgadmango.com"];


function pickImage(name) {
    const lower = String(name || "").toLowerCase();
    const match = IMAGES.find(([keyword]) => lower.includes(keyword));
    return match ? match[1] : null;
}


async function main() {

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

    console.log("✅ Connected to MongoDB\n");

    const products = await Product.find({});

    let updated = 0;

    for (const product of products) {

        const changes = [];

        // 1. Image missing or broken
        const needsImage =
            !product.image ||
            BROKEN_HOSTS.some((host) => product.image.includes(host));

        if (needsImage) {
            const image = pickImage(product.name);
            if (image) {
                product.image = image;
                changes.push("image added");
            } else {
                changes.push("no matching image for this name (skipped)");
            }
        }

        // 2. Category capitalisation ("fruits" -> "Fruits")
        const fixedCategory = PRODUCT_CATEGORIES.find(
            (c) => c.toLowerCase() === String(product.category || "").toLowerCase()
        );
        if (fixedCategory && fixedCategory !== product.category) {
            product.category = fixedCategory;
            changes.push(`category -> ${fixedCategory}`);
        }

        // 3. Missing farmer name
        if (!product.farmerName && product.farmer) {
            const farmer = await User.findById(product.farmer).select("name");
            if (farmer) {
                product.farmerName = farmer.name;
                changes.push(`farmer name -> ${farmer.name}`);
            }
        }

        const realChanges = changes.filter((c) => !c.includes("skipped"));

        if (realChanges.length) {
            await product.save({ validateBeforeSave: false });
            updated++;
        }

        if (changes.length) {
            console.log(`• ${product.name}: ${changes.join(", ")}`);
        }

    }

    console.log(`\n✅ Done. ${updated} product(s) updated, ${products.length} checked.`);

    await mongoose.disconnect();

}


main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
});
