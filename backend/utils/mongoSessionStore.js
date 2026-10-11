const session = require("express-session");
const mongoose = require("mongoose");


// =====================================================
// LOGIN SESSIONS STORED IN MONGODB
//
// express-session normally keeps sessions in server
// memory. That breaks on Vercel (serverless), where
// every request may run on a fresh server, so users
// would be logged out on every click.
//
// This small store saves each session as a document in
// the "sessions" collection instead. MongoDB deletes
// expired sessions automatically (TTL index).
// No extra npm package is needed.
// =====================================================

const sessionSchema = new mongoose.Schema(
    {
        _id: String,                 // session id
        session: Object,             // session data (userId, role, ...)
        expires: {
            type: Date,
            index: { expireAfterSeconds: 0 }
        }
    },
    {
        versionKey: false,
        minimize: false
    }
);

const SessionModel =
    mongoose.models.Session ||
    mongoose.model("Session", sessionSchema);


const ONE_DAY = 1000 * 60 * 60 * 24;


function expiryFor(sess) {

    if (sess && sess.cookie && sess.cookie.expires) {
        return new Date(sess.cookie.expires);
    }

    return new Date(Date.now() + ONE_DAY);

}


class MongoSessionStore extends session.Store {

    get(sid, callback) {

        SessionModel.findById(sid)
            .lean()
            .then((doc) => {

                if (!doc || (doc.expires && doc.expires < new Date())) {
                    return callback(null, null);
                }

                callback(null, doc.session);

            })
            .catch((error) => callback(error));

    }


    set(sid, sess, callback) {

        // Store a plain copy of the session data
        const data = JSON.parse(JSON.stringify(sess));

        SessionModel.updateOne(
            { _id: sid },
            { $set: { session: data, expires: expiryFor(sess) } },
            { upsert: true }
        )
            .then(() => callback && callback(null))
            .catch((error) => callback && callback(error));

    }


    destroy(sid, callback) {

        SessionModel.deleteOne({ _id: sid })
            .then(() => callback && callback(null))
            .catch((error) => callback && callback(error));

    }


    touch(sid, sess, callback) {

        SessionModel.updateOne(
            { _id: sid },
            { $set: { expires: expiryFor(sess) } }
        )
            .then(() => callback && callback(null))
            .catch((error) => callback && callback(error));

    }

}


module.exports = MongoSessionStore;
