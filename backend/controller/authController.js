const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { setFlash } = require("../utils/helpers");


// =====================================================
// SHOW REGISTER PAGE
// =====================================================

const showRegisterPage = (req, res) => {

    // Keep what the user typed if registration failed
    const old = req.session.oldInput || {};

    delete req.session.oldInput;

    // /register?role=farmer pre-selects the role
    if (!old.role && ["farmer", "buyer"].includes(req.query.role)) {
        old.role = req.query.role;
    }

    res.render("register", {
        title: "Register",
        old
    });

};


// =====================================================
// REGISTER USER
// =====================================================

const registerUser = async (req, res) => {

    const {
        name = "",
        phone = "",
        email = "",
        password = "",
        confirmPassword,
        role
    } = req.body;


    // Helper: go back to the form with a message
    const fail = (message) => {

        req.session.oldInput = {
            name,
            phone,
            email,
            role
        };

        setFlash(req, "danger", message);

        return res.redirect("/register");

    };


    try {

        // Check required fields

        if (
            !name.trim() ||
            !phone.trim() ||
            !email.trim() ||
            !password ||
            !role
        ) {

            return fail("Please fill in all required fields.");

        }


        if (name.trim().length < 2 || name.trim().length > 50) {

            return fail("Name must be between 2 and 50 characters.");

        }


        if (!/^[6-9]\d{9}$/.test(phone.trim())) {

            return fail("Please enter a valid 10-digit Indian phone number.");

        }


        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {

            return fail("Please enter a valid email address.");

        }


        if (password.length < 6) {

            return fail("Password must contain at least 6 characters.");

        }


        // Password confirmation

        if (
            confirmPassword !== undefined &&
            password !== confirmPassword
        ) {

            return fail("Passwords do not match.");

        }


        // Check role

        if (
            !["farmer", "buyer"].includes(role)
        ) {

            return fail("Please choose whether you are a farmer or a buyer.");

        }


        // Clean email

        const cleanEmail =
            email.toLowerCase().trim();


        // Check existing user

        const existingUser =
            await User.findOne({
                email: cleanEmail
            });


        if (existingUser) {

            return fail("An account with this email already exists.");

        }


        // Hash password

        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Create user

        const user = new User({

            name: name.trim(),

            phone: phone.trim(),

            email: cleanEmail,

            password: hashedPassword,

            role: role

        });


        await user.save();


        console.log(
            "✅ New user registered:",
            cleanEmail,
            "| Role:",
            role
        );


        setFlash(
            req,
            "success",
            "Account created successfully. Please login."
        );

        res.redirect("/login");


    } catch (error) {

        console.error(
            "❌ Registration Error:",
            error
        );

        // Duplicate email (unique index)
        if (error.code === 11000) {
            return fail("An account with this email already exists.");
        }

        // Mongoose validation message
        if (error.name === "ValidationError") {
            return fail(Object.values(error.errors)[0].message);
        }

        return fail("Something went wrong during registration. Please try again.");

    }

};


// =====================================================
// SHOW LOGIN PAGE
// =====================================================

const showLoginPage = (req, res) => {

    const oldEmail = req.session.oldEmail || "";

    delete req.session.oldEmail;

    res.render("login", {
        title: "Login",
        oldEmail,
        loggedOut: req.query.loggedOut === "1"
    });

};


// =====================================================
// LOGIN USER
// =====================================================

const loginUser = async (req, res) => {

    const {
        email = "",
        password = ""
    } = req.body;


    const fail = (message) => {

        req.session.oldEmail = email;

        setFlash(req, "danger", message);

        return res.redirect("/login");

    };


    try {

        // Check fields

        if (!email.trim() || !password) {

            return fail("Please enter your email and password.");

        }


        // Find user

        const user =
            await User.findOne({
                email: email.toLowerCase().trim()
            });


        // Check password (same message for both cases,
        // so attackers cannot tell which emails exist)

        const passwordMatch =
            user &&
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return fail("Invalid email or password.");

        }


        // ==========================================
        // CREATE SESSION
        // A fresh session ID is created at login
        // to prevent session fixation.
        // ==========================================

        const returnTo = req.session.returnTo;

        req.session.regenerate((regenerateError) => {

            if (regenerateError) {

                console.error(
                    "❌ Session Error:",
                    regenerateError
                );

                return fail("Unable to create login session. Please try again.");

            }


            req.session.userId =
                user._id.toString();

            req.session.userName =
                user.name;

            req.session.userEmail =
                user.email;

            req.session.role =
                user.role;

            req.session.flash = {
                type: "success",
                message: `Welcome back, ${user.name}!`
            };


            console.log(
                "✅ LOGIN SUCCESS:",
                user.email,
                "| Role:",
                user.role
            );


            // Save session before redirect

            req.session.save((saveError) => {

                if (saveError) {

                    console.error(
                        "❌ Session Save Error:",
                        saveError
                    );

                    return fail("Unable to create login session. Please try again.");

                }


                // Return to the page the user wanted,
                // otherwise go to the dashboard

                const safeReturn =
                    typeof returnTo === "string" &&
                    returnTo.startsWith("/") &&
                    !returnTo.startsWith("//")
                        ? returnTo
                        : "/dashboard";

                res.redirect(safeReturn);

            });

        });

    } catch (error) {

        console.error(
            "❌ Login Error:",
            error
        );

        return fail("Something went wrong during login. Please try again.");

    }

};


// =====================================================
// LOGOUT
// =====================================================

const logoutUser = (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "❌ Logout Error:",
                error
            );

        }


        res.clearCookie("connect.sid");

        res.redirect("/login?loggedOut=1");

    });

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    showRegisterPage,

    registerUser,

    showLoginPage,

    loginUser,

    logoutUser

};
