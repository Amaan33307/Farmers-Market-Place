const {
    setFlash,
    renderError,
    isValidId
} = require("../utils/helpers");


// =====================================================
// LOGIN REQUIRED
// Used for: dashboard, notifications, payments
// =====================================================

function requireLogin(req, res, next) {

    if (!req.session.userId) {

        // Remember the page so we can return after login
        if (req.method === "GET") {
            req.session.returnTo = req.originalUrl;
        }

        setFlash(req, "warning", "Please login to continue.");

        return res.redirect("/login");

    }

    next();

}


// =====================================================
// FARMER ONLY
// Used for: add/edit/delete product, farmer requests,
// accept/reject requests
// =====================================================

function requireFarmer(req, res, next) {

    if (!req.session.userId) {
        return requireLogin(req, res, next);
    }

    if (req.session.role !== "farmer") {

        return renderError(
            res,
            403,
            "This page is only available to farmers."
        );

    }

    next();

}


// =====================================================
// BUYER ONLY
// Used for: send product request, my requests, payment
// =====================================================

function requireBuyer(req, res, next) {

    if (!req.session.userId) {
        return requireLogin(req, res, next);
    }

    if (req.session.role !== "buyer") {

        return renderError(
            res,
            403,
            "This action is only available to buyers."
        );

    }

    next();

}


// =====================================================
// GUEST ONLY
// Logged-in users do not need login/register pages
// =====================================================

function requireGuest(req, res, next) {

    if (req.session.userId) {
        return res.redirect("/dashboard");
    }

    next();

}


// =====================================================
// VALID MONGODB ID IN URL
// Prevents CastError crashes for URLs like
// /products/abc
// =====================================================

function validateId(paramName = "id") {

    return (req, res, next) => {

        if (!isValidId(req.params[paramName])) {

            return renderError(
                res,
                404,
                "The item you are looking for does not exist."
            );

        }

        next();

    };

}


module.exports = {
    requireLogin,
    requireFarmer,
    requireBuyer,
    requireGuest,
    validateId
};
