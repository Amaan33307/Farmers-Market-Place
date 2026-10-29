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
    mango: `${T}/7/74/Mangos_-_single_and_halved.jpg/500px-Mangos_-_single_and_halved.jpg`,
    rice: `${T}/0/07/Khyma_and_Basmati_rice.jpg/500px-Khyma_and_Basmati_rice.jpg`,
    carrot: `${T}/a/a2/Vegetable-Carrot-Bundle-wStalks.jpg/500px-Vegetable-Carrot-Bundle-wStalks.jpg`,
    cauliflower: "https://upload.wikimedia.org/wikipedia/commons/2/25/Cauliflower.JPG",
    cabbage: `${T}/6/6f/Cabbage_and_cross_section_on_white.jpg/500px-Cabbage_and_cross_section_on_white.jpg`,
    brinjal: `${T}/7/76/Solanum_melongena_24_08_2012_%281%29.JPG/500px-Solanum_melongena_24_08_2012_%281%29.JPG`,
    okra: `${T}/7/7c/Lady%27s_fingers_%28Okra%29_in_Chennai.JPG/500px-Lady%27s_fingers_%28Okra%29_in_Chennai.JPG`,
    chilli: `${T}/8/86/Green_chillies.jpg/500px-Green_chillies.jpg`,
    spinach: `${T}/f/fe/Spinach_leaves.jpg/500px-Spinach_leaves.jpg`,
    cucumber: `${T}/9/96/ARS_cucumber.jpg/500px-ARS_cucumber.jpg`,
    garlic: `${T}/9/9a/Garlic_bulbs_and_cloves.jpg/500px-Garlic_bulbs_and_cloves.jpg`,
    ginger: `${T}/3/3d/Ginger_rhizome.jpg/500px-Ginger_rhizome.jpg`,
    peas: `${T}/9/91/Green_pea_pods.jpg/500px-Green_pea_pods.jpg`,
    capsicum: `${T}/3/39/Capsicum_annuum_fruits_IMGP0122.jpg/500px-Capsicum_annuum_fruits_IMGP0122.jpg`,
    bittergourd: `${T}/5/5b/Momordica_charantia_01052014.jpg/500px-Momordica_charantia_01052014.jpg`,
    pumpkin: `${T}/5/5c/FrenchMarketPumpkinsB.jpg/500px-FrenchMarketPumpkinsB.jpg`,
    beetroot: `${T}/5/52/Beetroots_in_a_basket.jpg/500px-Beetroots_in_a_basket.jpg`,
    radish: `${T}/2/23/Different_kinds_of_White_Radish.png/500px-Different_kinds_of_White_Radish.png`,
    coriander: `${T}/b/b7/Bunches_of_coriander_leaves.jpg/500px-Bunches_of_coriander_leaves.jpg`,
    sweetpotato: `${T}/5/58/Ipomoea_batatas_006.JPG/500px-Ipomoea_batatas_006.JPG`,
    pomegranate: `${T}/f/fa/Pomegranate_fruit_-_whole_and_piece_with_arils.jpg/500px-Pomegranate_fruit_-_whole_and_piece_with_arils.jpg`,
    grapes: `${T}/4/47/A_bunch_of_grapes_a.jpg/500px-A_bunch_of_grapes_a.jpg`,
    guava: `${T}/8/88/Guava_pink_fruit.jpg/500px-Guava_pink_fruit.jpg`,
    papaya: `${T}/0/09/Papaya_-_longitudinal_section.jpg/500px-Papaya_-_longitudinal_section.jpg`,
    watermelon: `${T}/a/ae/Watermelon_cross_BNC.jpg/500px-Watermelon_cross_BNC.jpg`,
    orange: `${T}/e/e3/Oranges_-_whole-halved-segment.jpg/500px-Oranges_-_whole-halved-segment.jpg`,
    apple: `${T}/1/15/Red_Apple.jpg/500px-Red_Apple.jpg`,
    chikoo: `${T}/0/0c/Chikoo.JPG/500px-Chikoo.JPG`,
    coconut: `${T}/f/f1/Coconuts_-_single_and_cracked_open.jpg/500px-Coconuts_-_single_and_cracked_open.jpg`,
    pineapple: `${T}/c/cb/Pineapple_and_cross_section.jpg/500px-Pineapple_and_cross_section.jpg`,
    strawberry: `${T}/4/4c/Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg/500px-Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg`,
    custardapple: `${T}/1/11/Sitaphal_%28Custard_apple%29%2C_India.jpg/500px-Sitaphal_%28Custard_apple%29%2C_India.jpg`,
    lemon: `${T}/e/e4/Lemon.jpg/500px-Lemon.jpg`,
    bajra: `${T}/e/e8/Food_grain_pearl_millet_1.jpg/500px-Food_grain_pearl_millet_1.jpg`,
    ragi: `${T}/3/31/Food_grain_finger_millet.jpg/500px-Food_grain_finger_millet.jpg`,
    chana: `${T}/d/d9/Ordinary_chickpeas_in_a_ceramic_bowl.jpg/500px-Ordinary_chickpeas_in_a_ceramic_bowl.jpg`,
    moong: `${T}/8/86/Mung_beans_%28Vigna_radiata%29.jpg/500px-Mung_beans_%28Vigna_radiata%29.jpg`,
    masoor: `${T}/4/43/Split_Red_Lentil.jpg/500px-Split_Red_Lentil.jpg`,
    urad: `${T}/6/6f/Black_gram.jpg/500px-Black_gram.jpg`,
    rajma: `${T}/c/c6/Red_Speckled_Kidney_Beans.jpg/500px-Red_Speckled_Kidney_Beans.jpg`,
    curd: `${T}/d/d4/Curd_in_steel_bowl.jpg/500px-Curd_in_steel_bowl.jpg`,
    paneer: `${T}/3/36/Panir_Paneer_Indian_cheese_fresh.jpg/500px-Panir_Paneer_Indian_cheese_fresh.jpg`,
    buttermilk: `${T}/2/23/Buttermilk-%28right%29-and-Milk-%28left%29.jpg/500px-Buttermilk-%28right%29-and-Milk-%28left%29.jpg`,
    honey: `${T}/9/95/Honey_jars.jpg/500px-Honey_jars.jpg`,
    groundnut: `${T}/2/28/Closeup_of_Peanuts%2C_selling_at_a_market_in_Jagadishpur_Hat.jpg/500px-Closeup_of_Peanuts%2C_selling_at_a_market_in_Jagadishpur_Hat.jpg`,
    cashew: `${T}/d/df/Cashew_nuts_with_skin.jpg/500px-Cashew_nuts_with_skin.jpg`,
    mustard: `${T}/6/6d/Mustard_Seeds_in_a_plate_at_Reganigudem.jpg/500px-Mustard_Seeds_in_a_plate_at_Reganigudem.jpg`,
    sugarcane: `${T}/d/d0/Sugarcane_stalks.jpg/500px-Sugarcane_stalks.jpg`,
};

// ---------- demo people ----------
const FARMERS = [
    { key: "ramesh", name: "Ramesh Patil", email: "ramesh.patil.demo@example.com", phone: "9822001001" },
    { key: "sunita", name: "Sunita Jadhav", email: "sunita.jadhav.demo@example.com", phone: "9822001002" },
    { key: "kiran", name: "Kiran More", email: "kiran.more.demo@example.com", phone: "9822001003" },
    { key: "mahesh", name: "Mahesh Shinde", email: "mahesh.shinde.demo@example.com", phone: "9822001004" },
    { key: "anita", name: "Anita Deshmukh", email: "anita.deshmukh.demo@example.com", phone: "9822001005" },
    { key: "vijay", name: "Vijay Chaudhari", email: "vijay.chaudhari.demo@example.com", phone: "9822001006" },
    { key: "ganesh", name: "Ganesh Wankhede", email: "ganesh.wankhede.demo@example.com", phone: "9822001007" },
    { key: "pooja", name: "Pooja Kale", email: "pooja.kale.demo@example.com", phone: "9822001008" },
    { key: "sachin", name: "Sachin Gaikwad", email: "sachin.gaikwad.demo@example.com", phone: "9822001009" },
    { key: "lata", name: "Lata Kulkarni", email: "lata.kulkarni.demo@example.com", phone: "9822001010" },
    { key: "deepak", name: "Deepak Bhosale", email: "deepak.bhosale.demo@example.com", phone: "9822001011" },
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
    // ----- Vegetables -----
    ["ramesh", "Hybrid Tomatoes", "Vegetables", 26, 600, "kg", "Nashik", IMG.tomato, "Firm hybrid tomatoes with a long shelf life. Good for hotels and vegetable shops."],
    ["mahesh", "Lasalgaon Onions", "Vegetables", 32, 2000, "kg", "Lasalgaon", IMG.onion, "Dry red onions from Lasalgaon, Asia's biggest onion market. Store well for weeks."],
    ["pooja", "Fresh Cauliflower", "Vegetables", 30, 250, "kg", "Ahmednagar", IMG.cauliflower, "White and tight cauliflower heads, picked this morning."],
    ["pooja", "Green Cabbage", "Vegetables", 20, 400, "kg", "Ahmednagar", IMG.cabbage, "Fresh and heavy cabbage heads, good for salads and sabzi."],
    ["sachin", "Purple Brinjal", "Vegetables", 28, 300, "kg", "Solapur", IMG.brinjal, "Shiny purple brinjal with few seeds, ideal for bharta and curry."],
    ["anita", "Tender Okra (Bhindi)", "Vegetables", 45, 150, "kg", "Pune", IMG.okra, "Soft, young bhindi picked daily. No hard or old pieces."],
    ["sachin", "Green Chillies", "Vegetables", 50, 120, "kg", "Solapur", IMG.chilli, "Spicy green chillies, fresh from the farm."],
    ["lata", "Fresh Spinach (Palak)", "Vegetables", 30, 100, "kg", "Pune", IMG.spinach, "Clean green palak leaves, washed and bundled."],
    ["deepak", "Red Carrots", "Vegetables", 40, 300, "kg", "Satara", IMG.carrot, "Sweet and crunchy carrots, good for salad and gajar halwa."],
    ["lata", "Fresh Cucumbers", "Vegetables", 25, 250, "kg", "Pune", IMG.cucumber, "Cool and fresh cucumbers for salads and raita."],
    ["ramesh", "Desi Garlic", "Vegetables", 120, 200, "kg", "Nashik", IMG.garlic, "Strong-smelling desi garlic with big cloves."],
    ["deepak", "Fresh Ginger", "Vegetables", 90, 150, "kg", "Satara", IMG.ginger, "Juicy Satara ginger, good for tea and cooking."],
    ["pooja", "Green Peas", "Vegetables", 60, 180, "kg", "Ahmednagar", IMG.peas, "Sweet green peas in fresh pods."],
    ["anita", "Mixed Capsicum", "Vegetables", 70, 120, "kg", "Pune", IMG.capsicum, "Green, red and yellow capsicum grown in a polyhouse."],
    ["sachin", "Bitter Gourd (Karela)", "Vegetables", 45, 100, "kg", "Solapur", IMG.bittergourd, "Fresh green karela, good for health."],
    ["ganesh", "Red Pumpkin", "Vegetables", 22, 500, "kg", "Nagpur", IMG.pumpkin, "Big orange pumpkins, sweet when cooked."],
    ["deepak", "Beetroot", "Vegetables", 35, 200, "kg", "Satara", IMG.beetroot, "Dark red beetroot, good for salad and juice."],
    ["lata", "White Radish (Mooli)", "Vegetables", 25, 150, "kg", "Pune", IMG.radish, "Fresh white mooli with leaves, good for parathas."],
    ["kiran", "Fresh Coriander", "Vegetables", 80, 60, "kg", "Satara", IMG.coriander, "Green and fresh kothimbir bunches with a strong smell."],
    ["ganesh", "Sweet Potatoes", "Vegetables", 40, 200, "kg", "Nagpur", IMG.sweetpotato, "Sweet potatoes (ratali), good for fasting days."],

    // ----- Fruits -----
    ["kiran", "Alphonso Mangoes", "Fruits", 250, 300, "kg", "Ratnagiri", IMG.mango, "Real Ratnagiri Alphonso (hapus), sweet and naturally ripened."],
    ["ganesh", "Kesar Mangoes", "Fruits", 150, 250, "kg", "Aurangabad", IMG.mango, "Sweet Kesar mangoes with a lovely smell."],
    ["sachin", "Bhagwa Pomegranate", "Fruits", 140, 400, "kg", "Solapur", IMG.pomegranate, "Deep red Bhagwa pomegranates from Solapur, juicy and sweet."],
    ["ramesh", "Nashik Grapes", "Fruits", 80, 500, "kg", "Nashik", IMG.grapes, "Seedless green grapes from Nashik vineyards."],
    ["pooja", "Pink Guava", "Fruits", 60, 200, "kg", "Ahmednagar", IMG.guava, "Pink guavas, soft and sweet inside."],
    ["anita", "Papaya", "Fruits", 35, 300, "kg", "Pune", IMG.papaya, "Ripe papayas with orange flesh, good for breakfast."],
    ["mahesh", "Watermelon", "Fruits", 18, 1000, "kg", "Latur", IMG.watermelon, "Big red watermelons, sweet and full of juice."],
    ["ganesh", "Nagpur Oranges", "Fruits", 70, 800, "kg", "Nagpur", IMG.orange, "Famous Nagpur oranges, juicy with a sweet-sour taste."],
    ["deepak", "Red Apples", "Fruits", 160, 200, "kg", "Satara", IMG.apple, "Crisp red apples, stored in cold storage."],
    ["kiran", "Chikoo (Sapota)", "Fruits", 60, 250, "kg", "Dahanu", IMG.chikoo, "Sweet Dahanu chikoo, soft and ready to eat."],
    ["kiran", "Fresh Coconuts", "Fruits", 35, 500, "piece", "Ratnagiri", IMG.coconut, "Mature coconuts from the Konkan coast, full of water and thick kernel."],
    ["lata", "Pineapple", "Fruits", 50, 150, "piece", "Pune", IMG.pineapple, "Sweet and juicy pineapples."],
    ["deepak", "Mahabaleshwar Strawberries", "Fruits", 300, 80, "kg", "Mahabaleshwar", IMG.strawberry, "Fresh red strawberries from Mahabaleshwar farms."],
    ["sachin", "Custard Apple (Sitaphal)", "Fruits", 90, 150, "kg", "Solapur", IMG.custardapple, "Creamy and sweet sitaphal, picked at the right time."],
    ["ganesh", "Fresh Lemons", "Fruits", 60, 200, "kg", "Nagpur", IMG.lemon, "Juicy lemons with thin skin, good for juice and pickles."],

    // ----- Grains -----
    ["kiran", "Indrayani Rice", "Grains", 65, 1000, "kg", "Maval", IMG.rice, "Sweet-smelling Indrayani rice from Maval, soft when cooked."],
    ["ganesh", "Sona Masoori Rice", "Grains", 55, 1200, "kg", "Nagpur", IMG.rice, "Light and fine Sona Masoori rice for daily meals."],
    ["sachin", "Bajra", "Grains", 28, 800, "kg", "Solapur", IMG.bajra, "Clean bajra grains, good for bhakri in winter."],
    ["deepak", "Ragi (Nachni)", "Grains", 45, 400, "kg", "Kolhapur", IMG.ragi, "Healthy nachni full of calcium, good for kids and elders."],

    // ----- Pulses -----
    ["pooja", "Chana (Chickpeas)", "Pulses", 75, 600, "kg", "Ahmednagar", IMG.chana, "Clean kabuli chana, big and white."],
    ["mahesh", "Green Moong", "Pulses", 105, 400, "kg", "Latur", IMG.moong, "Whole green moong, good for sprouts and dal."],
    ["ganesh", "Masoor Dal", "Pulses", 95, 350, "kg", "Nagpur", IMG.masoor, "Red masoor dal that cooks fast and tastes good."],
    ["vijay", "Urad Dal", "Pulses", 120, 300, "kg", "Jalgaon", IMG.urad, "Whole black urad, good for dal makhani and idli batter."],
    ["deepak", "Red Rajma", "Pulses", 130, 250, "kg", "Satara", IMG.rajma, "Shiny red rajma that becomes soft and creamy."],

    // ----- Dairy -----
    ["sunita", "Fresh Curd (Dahi)", "Dairy", 80, 100, "kg", "Pune", IMG.curd, "Thick curd made every day from pure cow milk."],
    ["kiran", "Fresh Paneer", "Dairy", 380, 50, "kg", "Satara", IMG.paneer, "Soft paneer made from full-cream milk, no added chemicals."],
    ["vijay", "Buttermilk (Chaas)", "Dairy", 40, 150, "litre", "Jalgaon", IMG.buttermilk, "Cool and fresh chaas, lightly salted."],

    // ----- Other -----
    ["lata", "Pure Honey", "Other", 450, 60, "kg", "Mahabaleshwar", IMG.honey, "Raw forest honey from Mahabaleshwar, no sugar added."],
    ["sachin", "Groundnuts", "Other", 110, 500, "kg", "Solapur", IMG.groundnut, "Fresh groundnuts with shell, good for oil and snacks."],
    ["kiran", "Konkan Cashew Nuts", "Other", 750, 80, "kg", "Sindhudurg", IMG.cashew, "Whole cashews from the Konkan region."],
    ["pooja", "Mustard Seeds", "Other", 90, 200, "kg", "Ahmednagar", IMG.mustard, "Clean black mustard seeds (rai) for tadka and pickles."],
    ["ramesh", "Sugarcane", "Other", 4, 5000, "kg", "Kolhapur", IMG.sugarcane, "Fresh and juicy sugarcane for juice stalls and jaggery units."],
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
    ["priya", "Fresh Paneer", 5, "completed", "card", "For our weekend menu."],
    ["priya", "Alphonso Mangoes", 10, "pending", null, "Are these naturally ripened?"],
    ["rahul", "Nagpur Oranges", 50, "accepted", null, "Need for juice counter in our shop."],
    ["rahul", "Bhagwa Pomegranate", 20, "completed", "upi", "Good quality please."],
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
    // fix small mistakes first (e.g. "fruits" -> "Fruits") so real listings are not removed
    for (const p of await Product.find({ category: { $nin: PRODUCT_CATEGORIES } })) {
        const fixed = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === String(p.category || "").trim().toLowerCase());
        if (fixed) await Product.updateOne({ _id: p._id }, { $set: { category: fixed } });
    }
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
