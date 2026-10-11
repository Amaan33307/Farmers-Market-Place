const express = require("express");

const router = express.Router();

const Notification = require("../models/Notification");

const {
    requireLogin,
    validateId
} = require("../middleware/auth");

const { setFlash } = require("../utils/helpers");


// =====================================================
// NOTIFICATIONS PAGE
// GET /notifications
// =====================================================

router.get(
    "/",
    requireLogin,
    async (req, res) => {

        const notifications =
            await Notification.find({
                recipient: req.session.userId
            })
            .sort({
                createdAt: -1
            });


        const unreadCount =
            notifications.filter((n) => !n.read).length;


        res.render(
            "notifications",
            {
                title: "Notifications",
                notifications,
                unreadCount
            }
        );

    }
);


// =====================================================
// MARK ALL AS READ
// POST /notifications/mark-all-read
// (must be defined before "/:id/..." routes)
// =====================================================

router.post(
    "/mark-all-read",
    requireLogin,
    async (req, res) => {

        await Notification.updateMany(
            {
                recipient: req.session.userId,
                read: false
            },
            {
                read: true
            }
        );

        setFlash(req, "success", "All notifications marked as read.");

        res.redirect("/notifications");

    }
);


// =====================================================
// MARK SINGLE NOTIFICATION AS READ
// POST /notifications/:id/read
// =====================================================

router.post(
    "/:id/read",
    requireLogin,
    validateId("id"),
    async (req, res) => {

        await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                recipient: req.session.userId
            },
            {
                read: true
            }
        );

        res.redirect("/notifications");

    }
);


// =====================================================
// DELETE NOTIFICATION
// POST /notifications/:id/delete
// =====================================================

router.post(
    "/:id/delete",
    requireLogin,
    validateId("id"),
    async (req, res) => {

        await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.session.userId
        });

        res.redirect("/notifications");

    }
);


module.exports = router;
