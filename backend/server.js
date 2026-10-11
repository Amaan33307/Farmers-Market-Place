const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const { APP_NAME } = require("./config/constants");
const { renderError } = require("./utils/helpers");
const MongoSessionStore = require("./utils/mongoSessionStore");
const Notification = require("./models/Notification");
const aiAssistant = require("./services/aiAssistant");

const app = express();

app.disable("x-powered-by");

// Behind Vercel / Render proxies (needed for secure cookies)
app.set("trust proxy", 1);


// =====================================================
// MONGODB CONNECTION
// Connects once and reuses the connection. On Vercel
// each request may start a new function instance, so
// every request first makes sure the database is ready.
// =====================================================

let connectionPromise = null;

function connectDB() {

    if (mongoose.connection.readyState === 1) {
        return Promise.resolve();
    }

    if (!connectionPromise) {

        if (!process.env.MONGO_URI) {
            return Promise.reject(
                new Error("MONGO_URI is missing. Add it to the .env file (or Vercel environment variables).")
            );
        }

        connectionPromise =
            mongoose
                .connect(process.env.MONGO_URI, {
                    serverSelectionTimeoutMS: 10000
                })
                .then(() => {
                    console.log("✅ MongoDB Connected");
                })
                .catch((error) => {
                    connectionPromise = null;
                    throw error;
                });

    }

    return connectionPromise;

}


app.use(async (req, res, next) => {

    try {

        await connectDB();

        next();

    } catch (error) {

        console.error("❌ MongoDB Connection Failed:", error.message);

        // Safe hint for the site owner (never shows passwords)
        const text = String(error.message || "");

        let hint = "Please try again in a moment.";

        if (/MONGO_URI is missing/.test(text)) {
            hint = "Setup: the MONGO_URI environment variable is missing.";
        } else if (/auth|authentication|bad auth/i.test(text)) {
            hint = "Setup: MongoDB rejected the username/password in MONGO_URI.";
        } else if (/whitelist|IP|ENOTFOUND|querySrv|timed out|Server selection/i.test(text)) {
            hint = "Setup: MongoDB Atlas is not accepting connections from this server. In Atlas, open Network Access and allow 0.0.0.0/0.";
        } else if (/Invalid scheme|URI|parse/i.test(text)) {
            hint = "Setup: MONGO_URI is not a valid MongoDB connection string.";
        }

        res
            .status(503)
            .send("The database is not reachable right now. " + hint);

    }

});


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

        // Sessions are saved in MongoDB, so logins survive
        // server restarts and work on Vercel (serverless)
        store: new MongoSessionStore(),

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: "lax",
            // HTTPS-only cookie when deployed
            secure: process.env.NODE_ENV === "production" ? "auto" : false
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
// START SERVER
// Locally:  npm run dev  -> connects to MongoDB, then listens.
// Vercel:   api/index.js imports this app (no app.listen).
// =====================================================

const PORT =
    process.env.PORT || 5000;


if (require.main === module) {

    connectDB()

        .then(() => {

            app.listen(
                PORT,
                () => {

                    console.log(
                        `✅ ${APP_NAME} running on http://localhost:${PORT}`
                    );

                }
            );

        })

        .catch((error) => {

            console.log("❌ MongoDB Connection Failed");

            console.log(error.message);

            process.exit(1);

        });

}


module.exports = app;
