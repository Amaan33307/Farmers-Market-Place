const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const { APP_NAME } = require("./config/constants");
const { renderError } = require("./utils/helpers");
const Notification = require("./models/Notification");
const aiAssistant = require("./services/aiAssistant");

const app = express();

app.disable("x-powered-by");


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// STATIC FILES (frontend/src/assets)
// =====================================================

app.use(
    "/assets",
    express.static(
        path.join(__dirname, "../frontend/src/assets")
    )
);


// =====================================================
// SESSION
// =====================================================

if (!process.env.SESSION_SECRET) {

    console.warn(
        "⚠️  SESSION_SECRET is not set in .env — using a development fallback."
    );

}

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "farmer-marketplace-dev-secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: "lax"
        }
    })
);


// =====================================================
// GLOBAL VARIABLES FOR EVERY EJS PAGE
// header.ejs and other shared components can always
// use these without "is not defined" errors.
// =====================================================

app.use(
    async (req, res, next) => {

        res.locals.appName = APP_NAME;

        res.locals.userId =
            req.session.userId || null;

        res.locals.userName =
            req.session.userName || null;

        res.locals.userEmail =
            req.session.userEmail || null;

        res.locals.role =
            req.session.role || null;

        res.locals.currentPath = req.path;

        res.locals.title = null;

        res.locals.aiEnabled =
            aiAssistant.isEnabled();


        // One-time flash message
        res.locals.flash =
            req.session.flash || null;

        delete req.session.flash;


        // Unread notification badge
        res.locals.unreadCount = 0;

        if (
            req.session.userId &&
            req.method === "GET" &&
            mongoose.connection.readyState === 1
        ) {

            try {

                res.locals.unreadCount =
                    await Notification.countDocuments({
                        recipient: req.session.userId,
                        read: false
                    });

            } catch (error) {

                console.error(
                    "❌ Unread Count Error:",
                    error.message
                );

            }

        }

        next();

    }
);


// =====================================================
// EJS
// =====================================================

app.set(
    "views",
    path.join(
        __dirname,
        "../frontend/src/pages"
    )
);

app.set(
    "view engine",
    "ejs"
);


// =====================================================
// ROUTES
// =====================================================

const pageRoutes =
    require("./routes/pageRoutes");

const authRoutes =
    require("./routes/authRoutes");

const farmerRoutes =
    require("./routes/farmerRoutes");

const productRoutes =
    require("./routes/productRoutes");

const orderRoutes =
    require("./routes/orderRoutes");

const notificationRoutes =
    require("./routes/notificationRoutes");

const paymentRoutes =
    require("./routes/paymentRoutes");

const aiRoutes =
    require("./routes/aiRoutes");


// Website pages: /, /marketplace, /farmers, /about,
// /contact, /dashboard
app.use("/", pageRoutes);

// Authentication: /register, /login, /logout
app.use("/", authRoutes);

// Products: /products/...
app.use("/products", productRoutes);

// Requests / orders: /orders/...
app.use("/orders", orderRoutes);

// Notifications: /notifications/...
app.use("/notifications", notificationRoutes);

// Demo payment for accepted requests: /payment/...
app.use("/payment", paymentRoutes);

// AI features (JSON): /ai/price-insight,
// /ai/description, /ai/assistant
app.use("/ai", aiRoutes);

// Farmer records JSON API (kept from the original
// project, moved from /farmers so it no longer clashes
// with the Farmers web page)
app.use("/api/farmers", farmerRoutes);


// =====================================================
// 404 — PAGE NOT FOUND
// =====================================================

app.use(
    (req, res) => {

        renderError(
            res,
            404,
            "The page you are looking for does not exist."
        );

    }
);


// =====================================================
// 500 — UNEXPECTED ERRORS
// Logs details in the terminal, shows a clean page
// to the user (no stack traces).
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ Unexpected Error:",
            error
        );

        if (res.headersSent) {
            return next(error);
        }

        renderError(
            res,
            500,
            "Something went wrong. Please try again."
        );

    }
);


// =====================================================
// MONGODB + START SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;


if (!process.env.MONGO_URI) {

    console.log(
        "❌ MONGO_URI is missing. Add it to the .env file in the project folder."
    );

    process.exit(1);

}


mongoose
    .connect(
        process.env.MONGO_URI,
        {
            serverSelectionTimeoutMS: 10000
        }
    )

    .then(() => {

        console.log(
            "================================="
        );

        console.log(
            "✅ MongoDB Connected"
        );

        console.log(
            "================================="
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `✅ ${APP_NAME} running on http://localhost:${PORT}`
                );

            }
        );

    })

    .catch(
        (error) => {

            console.log(
                "================================="
            );

            console.log(
                "❌ MongoDB Connection Failed"
            );

            console.log(
                "================================="
            );

            console.log(
                error.message
            );

        }
    );
