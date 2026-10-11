// =====================================================
// APP-WIDE CONSTANTS
// Single source of truth for values used by
// routes, controllers and EJS pages.
// =====================================================

const APP_NAME = "Farmer Marketplace";

const PRODUCT_CATEGORIES = [
    "Vegetables",
    "Fruits",
    "Grains",
    "Pulses",
    "Dairy",
    "Other"
];

const PRODUCT_UNITS = [
    "kg",
    "quintal",
    "ton",
    "litre",
    "piece"
];

module.exports = {
    APP_NAME,
    PRODUCT_CATEGORIES,
    PRODUCT_UNITS
};
