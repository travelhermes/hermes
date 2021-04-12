/* jshint esversion: 8 */
const db = require("../db/models.js");

/**
 * Generates a random string of a given length
 * @param  {number} length Length of the string
 * @return {string}        Random string
 */
function _makeString(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/*
 * Session Class
 */
class Session {
    /**
     * Create a new session
     * @param  {number} userId User ID that will be assigned for the session
     * @param  {string} ip     IP of the request
     * @param  {number} maxAge TTL of session, in seconds
     * @return {string}        Session key
     */
    static async createSession(userId, ip, maxAge) {
        await db.Login.create({
            UserId: userId,
            ip: ip,
        });

        var session = _makeString(255);
        await db.Session.create({
            key: session,
            UserId: userId,
            maxAge: maxAge,
        });
        return session;
    }

    /**
     * Checks if a session exists and is within age
     * @param  {Request} request HTTP request to get cookies from
     * @return {boolean}         true if session is valid, false otherwise
     */
    static async checkSession(request) {
        // Get cookie
        const session = request.cookies.hermesSession;
        if (!session) {
            return false;
        }

        // Get session row
        const dbSession = await db.Session.findOne({
            where: {
                key: request.unsignCookie(session).value,
            },
        });

        // Return false if session does not exist
        if (dbSession == null) {
            return false;
        }

        // Return false if session is expired
        if (dbSession.maxAge < (new Date() - dbSession.createdAt) / 1000) {
            await dbSession.destroy();
            return false;
        }

        return true;
    }

    /**
     * Retrieve the User of a session
     * @param  {Request} request HTTP request to get cookies from
     * @return {User | null} User, or null if not found
     */
    static async getSessionUser(request) {
        // Get cookie
        const session = request.cookies.hermesSession;
        if (!session) {
            return null;
        }

        // Get session row
        const user = await db.User.findOne({
            include: [
                {
                    model: db.Session,
                    where: {
                        key: request.unsignCookie(session).value,
                    },
                },
            ],
        });

        // Return user if session exists, null otherwise
        return user;
    }

    /**
     * Retrieve the userId of a session
     * @param  {Request} request HTTP request to get cookies from
     * @return {number | null} userId, or null if not found
     */
    static async getSessionUserId(request) {
        // Get cookie
        const session = request.cookies.hermesSession;
        if (!session) {
            return null;
        }

        // Get session row
        const dbSession = await db.Session.findOne({
            where: {
                key: request.unsignCookie(session).value,
            },
        });

        // Return id if row exists, null otherwise
        return dbSession != null ? dbSession.UserId : null;
    }

    /**
     * Delete a session
     * @param  {Request} request HTTP request to get cookies from
     */
    static async destroySession(request) {
        // Get cookie
        const session = request.cookies.hermesSession;
        if (!session) {
            return;
        }

        // Get session row
        await db.Session.destroy({
            where: {
                key: request.unsignCookie(session).value,
            },
        });

        return;
    }
}

exports.Session = Session;
