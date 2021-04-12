/* jshint esversion: 8 */
const db = require('../db/models.js');
const { Session } = require('../controllers/session.js');

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    FATAL: 4,
};

/**
 * Logs accesses to the app
 */
class AccessLogger {
    constructor() {}

    /**
     * Log a new event.
     * @param  {LogLevel} level   Log level: DEBUG, INFO, WARNING, ERROR or FATAL.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static async log(level, request, reply, message) {
        if (typeof message == 'object') {
            message = JSON.stringify(message);
        }
        
        const userId = await Session.getSessionUserId(request);
        const ip = request.realIp;
        const location = request.url;
        const status = reply.statusCode;

        db.AccessLog.create({
            level: level,
            userId: userId,
            ip: ip,
            location: location,
            status: status,
            message: message.toString(),
        });
    }

    /**
     * Log a new DEBUG event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static debug(request, reply, message) {
        this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new INFO event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static info(request, reply, message) {
        this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new WARNING event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static warning(request, reply, message) {
        this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new ERROR event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static error(request, reply, message) {
        this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new FATAL event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     * @param  {string}   message (Optional) Message to log.
     */
    static fatal(request, reply, message) {
        this.log(LogLevel.INFO, request, reply, message);
    }
}

/**
 * Logs application informations and errors
 */
class ApplicationLogger {
    constructor() {}

    /**
     * Log a new event
     * @param  {LogLevel}        level    Log level: DEBUG, INFO, WARNING, ERROR or FATAL.
     * @param  {number | null}   userId   User ID
     * @param  {string | null}   ip       IP address
     * @param  {string | null}   location Location of the event
     * @param  {number | null}   status   HTTP Status code
     * @param  {string | null}   message  Message to log.
     * @return {Promise<number>}          Returns the assigned event ID.
     */
    static logBase(level, userId, ip, location, status, message) {
        return new Promise(async (resolve) => {
            if (typeof message == 'object') {
                message = JSON.stringify(message);
            }
            db.ApplicationLog.create({
                level: level,
                userId: userId,
                ip: ip,
                location: location,
                status: status,
                message: message.toString(),
            })
                .then((res) => {
                    resolve(res.id);
                })
                .catch((err) => {
                    console.log(
                        `[${new Date().toLocaleString()}] (Log) FATAL - ${location}: Error creating Log entry: ${JSON.stringify(
                            err
                        )}. Original: ${message}`
                    );
                    resolve(null);
                });
        });
    }

    static async log(level, request, reply, message) {
        const userId = await Session.getSessionUserId(request);
        const ip = request.realIp;
        const location = request.url;
        const status = reply.statusCode;

        return this.logBase(level, userId, ip, location, status, message);
    }

    /**
     * Log a new DEBUG event.
     * @param  {Request}         request HTTP Request
     * @param  {Reply}           reply   HTTP reply.
     * @param  {string}          message (Optional) Message to log.
     * @return {Promise<number>}         Returns the assigned event ID.
     */
    static debug(request, reply, message) {
        return this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new INFO event.
     * @param  {Request}         request HTTP Request
     * @param  {Reply}           reply   HTTP reply.
     * @param  {string}          message (Optional) Message to log.
     * @return {Promise<number>}         Returns the assigned event ID.
     */
    static info(request, reply, message) {
        return this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new WARNING event.
     * @param  {Request}         request HTTP Request
     * @param  {Reply}           reply   HTTP reply.
     * @param  {string}          message (Optional) Message to log.
     * @return {Promise<number>}         Returns the assigned event ID.
     */
    static warning(request, reply, message) {
        return this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new ERROR event.
     * @param  {Request}         request HTTP Request
     * @param  {Reply}           reply   HTTP reply.
     * @param  {string}          message (Optional) Message to log.
     * @return {Promise<number>}         Returns the assigned event ID.
     */
    static error(request, reply, message) {
        return this.log(LogLevel.INFO, request, reply, message);
    }

    /**
     * Log a new FATAL event.
     * @param  {Request}         request HTTP Request
     * @param  {Reply}           reply   HTTP reply.
     * @param  {string}          message (Optional) Message to log.
     * @return {Promise<number>}         Returns the assigned event ID.
     */
    static fatal(request, reply, message) {
        return this.log(LogLevel.INFO, request, reply, message);
    }
}

exports.LogLevel = LogLevel;
exports.AccessLogger = AccessLogger;
exports.ApplicationLogger = ApplicationLogger;
