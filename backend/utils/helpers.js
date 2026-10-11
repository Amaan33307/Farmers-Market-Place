const mongoose = require("mongoose");


// =====================================================
// FLASH MESSAGES
// Stores a one-time message in the session.
// server.js moves it into res.locals.flash on the
// next request, and header.ejs displays it.
// type: "success" | "danger" | "warning" | "info"
// =====================================================

function setFlash(req, type, message) {

    if (req.session) {
        req.session.flash = { type, message };
    }

}


// =====================================================
// ERROR PAGE
// Renders the shared error.ejs page instead of
// plain-text responses.
// =====================================================

function renderError(res, status, message, title) {

    const defaultTitles = {
        400: "Invalid Request",
        403: "Access Denied",
        404: "Page Not Found",
        500: "Something Went Wrong"
    };

    return res.status(status).render("error", {
        title: title || defaultTitles[status] || "Error",
        status,
        message
    });

}


// =====================================================
// SAFE SEARCH
// Escapes user input before using it in a MongoDB
// $regex so characters like "(" or "*" cannot break
// the query.
// =====================================================

function escapeRegex(text = "") {

    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

}


// =====================================================
// OBJECT ID CHECK
// =====================================================

function isValidId(id) {

    return mongoose.Types.ObjectId.isValid(id) &&
        String(new mongoose.Types.ObjectId(id)) === String(id);

}


// =====================================================
// SAFE REDIRECT BACK
// Only allows redirects to paths on this site.
// =====================================================

function safeBack(req, fallback) {

    const referer = req.get("Referer") || "";

    try {

        const url = new URL(referer);

        if (url.host === req.get("host")) {
            return url.pathname + url.search;
        }

    } catch (error) {
        // invalid or missing referer
    }

    return fallback;

}


module.exports = {
    setFlash,
    renderError,
    escapeRegex,
    isValidId,
    safeBack
};
