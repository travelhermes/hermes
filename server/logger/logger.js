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
    static async log(level, request, reply) {
        const userId = await Session.getSessionUserId(request);
        const ip = request.realIp;
        const location = request.url;
        const status = reply.statusCode;
        const time = request.endTime - request.startTime;

        db.AccessLog.create({
            level: level,
            hostname: process.env.SERVER || '',
            worker: request.worker,
            userId: userId,
            ip: ip,
            location: location,
            status: status,
            time: time,
            message: JSON.stringify({
                'user-agent': request.headers['user-agent'],
                accept: request.headers.accept,
                'accept-encoding': request.headers['accept-encoding'],
                connection: request.headers.connection,
            }),
        });
    }

    /**
     * Log a new DEBUG event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     */
    static debug(request, reply) {
        this.log(LogLevel.INFO, request, reply);
    }

    /**
     * Log a new INFO event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     */
    static info(request, reply) {
        this.log(LogLevel.INFO, request, reply);
    }

    /**
     * Log a new WARNING event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     */
    static warning(request, reply) {
        this.log(LogLevel.INFO, request, reply);
    }

    /**
     * Log a new ERROR event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     */
    static error(request, reply) {
        this.log(LogLevel.INFO, request, reply);
    }

    /**
     * Log a new FATAL event.
     * @param  {Request}  request HTTP Request
     * @param  {Reply}    reply   HTTP reply.
     */
    static fatal(request, reply) {
        this.log(LogLevel.INFO, request, reply);
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
     * @param  {number}          worker   Process worker ID
     * @param  {number | null}   userId   User ID
     * @param  {string | null}   ip       IP address
     * @param  {string | null}   location Location of the event
     * @param  {number | null}   status   HTTP Status code
     * @param  {string | null}   message  Message to log.
     * @return {Promise<number>}          Returns the assigned event ID.
     */
    static logBase(level, worker, userId, ip, location, status, message) {
        return new Promise(async (resolve) => {
            message = { msg: message };
            db.ApplicationLog.create({
                level: level,
                hostname: process.env.SERVER || '',
                worker: worker || 0,
                userId: userId,
                ip: ip,
                location: location,
                status: status,
                message: JSON.stringify(message),
            })
                .then((res) => {
                    resolve(res.id);
                })
                .catch((err) => {
                    console.log(
                        `[${new Date().toLocaleString()}] (Log) FATAL - ${location}: Error creating Log entry: ${JSON.stringify(
                            err
                        )}. Original: ${JSON.stringify(message)}`
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

        return this.logBase(level, request.worker, userId, ip, location, status, message);
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
