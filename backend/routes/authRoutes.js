const express = require("express");

const router = express.Router();

const {
    showRegisterPage,
    registerUser,
    showLoginPage,
    loginUser,
    logoutUser
} = require("../controller/authController");

const {
    requireGuest
} = require("../middleware/auth");


// =====================================================
// REGISTER
// =====================================================

// GET /register
router.get(
    "/register",
    requireGuest,
    showRegisterPage
);


// POST /register
router.post(
    "/register",
    requireGuest,
    registerUser
);


// =====================================================
// LOGIN
// =====================================================

// GET /login
router.get(
    "/login",
    requireGuest,
    showLoginPage
);


// POST /login
router.post(
    "/login",
    requireGuest,
    loginUser
);


// =====================================================
// LOGOUT
// =====================================================

// GET /logout
router.get(
    "/logout",
    logoutUser
);


module.exports = router;
