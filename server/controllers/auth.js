/*jshint esversion: 8 */
const axios = require('axios');
const bcrypt = require('bcrypt');
const CONFIG = require('../config.json');
const db = require('../db/models.js');
const validator = require('validator');
const { ApplicationLogger, LogLevel } = require('../logger/logger.js');
const { Cache } = require('../utils/cache.js');
const { hasDuplicates } = require('../utils/arrays.js');
const { MailType } = require('../mail/mail.js');
const { Op } = require('sequelize');
const { sanitize } = require('../utils/text.js');
const { Session } = require('./session.js');

const publicPaths = [
    { type: 'contains', value: '/assets', cache: true },
    { type: 'contains', value: '/attributions', cache: true },
    { type: 'contains', value: '/css', cache: true },
    { type: 'contains', value: '/help', cache: true },
    { type: 'contains', value: '/help/signin', cache: true },
    { type: 'contains', value: '/help/signup', cache: true },
    { type: 'contains', value: '/js', cache: true },
    { type: 'contains', value: '/privacy', cache: true },
    { type: 'contains', value: '/recover', cache: true },
    { type: 'contains', value: '/signin', cache: false },
    { type: 'contains', value: '/signup', cache: false },
    { type: 'contains', value: '/terms', cache: true },
    { type: 'equals', value: '/', cache: true },
    { type: 'equals', value: '/api/auth/check', cache: false },
    { type: 'equals', value: '/api/auth/password/change', cache: false },
    { type: 'equals', value: '/api/auth/password/request', cache: false },
    { type: 'equals', value: '/api/places/random', cache: false },
    { type: 'equals', value: '/favicon.ico', cache: true },
];

//
// Init
//
// Cache categories in memory for validation performance reasons
// This Cache object is duplicated in memory because of account.js
// but because there are not too many categories, duplicating should not
// be a problem.
var categoriesCache;

//
// Utils
//
/**
 * Hashes a password with bcrypt
 * Number of rounds is determined by 10 + sum of the numbers in the password
 * The password is a prehashed SHA256 value
 * Strings without numbers, default to 10 rounds.
 * @param  {string} password SHA256 hash of user password
 * @return {Promise<hash>}   Promise with the bcrypt hashed password
 */
function _hashPassword(password) {
    const digits = password.replace(/[a-zA-Z]/g, '');
    var sum = 0;
    for (var i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i]);
    }

    // https://security.stackexchange.com/questions/17207/recommended-of-rounds-for-bcrypt
    // From 10 to 16 rounds
    return bcrypt.hash(password, 10 + (sum % 7));
}

/**
 * Checks a password against a bcrypt hash
 * @param  {string} password SHA256 hash of user password
 * @return {Promise<boolean>} Promise with a boolean value
 */
function _comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generates a random string of a given length
 * @param  {number} length Length of the string
 * @return {string}        Random string
 */
function _makeString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/*
 * Authentication Middleware
 */
class AuthMiddleware {
    constructor(fastify) {
        this.fastify = fastify;
        fastify.addHook('onRequest', this.middleware);
    }

    /**
     * Check if request should be authenticated or not
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async middleware(request, reply) {
        const status = await Session.checkSession(request);
        if (!status) {
            // Check if url is in public paths
            for (var i = 0; i < publicPaths.length; i++) {
                switch (publicPaths[i].type) {
                    case 'contains': {
                        if (request.url.includes(publicPaths[i].value)) {
                            if (publicPaths[i].cache) {
                                reply.header('Cache-Control', 'max-age=86400');
                            } else {
                                reply.header('Cache-Control', 'no-store');
                            }
                            return;
                        }
                        break;
                    }
                    case 'equals': {
                        if (request.url == publicPaths[i].value) {
                            if (publicPaths[i].cache) {
                                reply.header('Cache-Control', 'max-age=86400');
                            } else {
                                reply.header('Cache-Control', 'no-store');
                            }
                            return;
                        }
                        break;
                    }
                }
            }

            // Redirect otherwise
            var redirect = Buffer.from(request.url, 'utf-8').toString('base64');
            reply.header('Cache-Control', 'no-store');
            reply.status(301).redirect('/signin/?redirect=' + redirect);
            //reply.status(301).redirect('/signin/');
            return;
        } else {
            if (request.url.includes('/api')) {
                reply.header('Cache-Control', 'no-store');
            } else {
                reply.header('Cache-Control', 'max-age=86400');
            }

            if (
                !request.url.includes('/help') &&
                (request.url.includes('/signin') || request.url.includes('/signup'))
            ) {
                reply.redirect('/dashboard/');
                return;
            }
            return;
        }
    }
}

/*
 * Authentication Controller
 */
class AuthController {
    constructor(fastify) {
        // Init cache
        this._createCache();

        // Info methods
        fastify.post(
            '/api/auth/check',
            {
                config: {
                    rateLimit: {
                        max: 100,
                        timeWindow: '10m',
                    },
                },
            },
            this.check
        );
        fastify.get('/api/auth/id', this.id);

        // Sign in, sign up and logout
        fastify.post('/api/auth/signin', this.signin);
        fastify.post('/api/auth/signup', this.signup);
        fastify.get('/api/auth/logout', this.logout);
        fastify.get('/api/auth/logoutSessions', this.logoutSessions);

        // Password changes
        fastify.post('/api/auth/password/request', this.request);
        fastify.put('/api/auth/password/change', this.change);
        fastify.put('/api/auth/password/update', this.update);

        // Account deletion
        fastify.post('/api/auth/delete', this.del);
    }

    /**
     * Creates a module's global cache
     */
    async _createCache() {
        categoriesCache = new Cache(
            await db.Category.findAll({
                attributes: ['id'],
            })
        );
    }

    /**
     * Checks if a user with a given email already exists and if captcha is valid
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async check(request, reply) {
        if (!request.body || !request.body.email || !validator.isEmail(request.body.email) || !request.body.hCaptcha) {
            reply.status(400).send();
            return;
        }

        request.body.email = sanitize(request.body.email);

        const params = new URLSearchParams();
        params.append('response', request.body.hCaptcha);
        params.append('secret', CONFIG.hCaptcha.secret);
        params.append('sitekey', CONFIG.hCaptcha.sitekey);

        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        };

        axios
            .post('https://hcaptcha.com/siteverify', params, config)
            .then(async (result) => {
                if (result.data.success) {
                    // Get user
                    const user = await db.User.findOne({
                        where: {
                            email: request.body.email,
                        },
                    });

                    // If user exists, reply with true
                    reply.status(200).send({ exists: user ? true : false });
                } else {
                    reply.status(403).send();
                }
            })
            .catch(async (error) => {
                const logId = await ApplicationLogger.fatal(request, reply, error);
                reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
            });
    }

    /**
     * REQUIRES SESSION!
     * Returns the UserId of a given session
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async id(request, reply) {
        reply.send({ id: await Session.getSessionUserId(request) });
    }

    /**
     * Signs In a user into the platform
     * Always waits 1s before sending a reply
     * Has 15 min. cooldown after 5 unsuccesful login attempts
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async signin(request, reply) {
        // Check if request is valid
        if (
            !request.body ||
            !request.body.email ||
            !validator.isEmail(request.body.email) ||
            !request.body.password ||
            !validator.isHexadecimal(request.body.password)
        ) {
            reply.status(400).send();
            return;
        }

        request.body.email = sanitize(request.body.email);
        request.body.password = sanitize(request.body.password);

        // Get user
        const user = await db.User.findOne({
            where: {
                email: request.body.email,
            },
        });

        // If user exists
        if (user) {
            // 15min cooldown if more than 5 login attempts have been made
            const timePassed = new Date() - user.lastAttempt;
            if (user.attempts > 5 && timePassed < 900000) {
                ApplicationLogger.logBase(
                    LogLevel.WARNING,
                    request.worker,
                    user.id,
                    request.realIp,
                    request.url,
                    429,
                    'Cooldown'
                );
                reply.status(429).send();
                return;
            }

            // Measure time to prevent timing attacks
            var start = new Date();

            // Compare hash with password
            _comparePassword(request.body.password, user.password)
                .then((value) => {
                    // Always wait 1000ms before returning anything
                    // If multiple attempts have been made, wait (attempts * 1500) aditional ms
                    var waitTime = Math.max(1000, new Date() - start) + user.attempts * 1000;
                    setTimeout(async () => {
                        // Continue signin if password is OK
                        if (value) {
                            // Get previous logins with this IP
                            const prevLogin = await db.Login.findOne({
                                where: {
                                    ip: request.realIp,
                                    UserId: user.id,
                                },
                            });

                            // Create a new session
                            const session = await Session.createSession(
                                user.id,
                                request.realIp,
                                request.body.remember ? 1209600 : 86400
                            );

                            // Send reply
                            reply
                                .setCookie('hermesSession', session, {
                                    path: '/',
                                    signed: true,
                                    maxAge: request.body.remember ? 1209600 : 86400,
                                    sameSite: true,
                                })
                                .status(200)
                                .send();

                            // Reset user attempts
                            user.attempts = 0;
                            user.lastAttempt = new Date();
                            await user.save();

                            // Send new login message if IP hasn't been seen previously
                            if (!prevLogin) {
                                mailServer.add(request.body.email, MailType.newLogin, {
                                    name: user.name,
                                    date: new Date().toLocaleString(),
                                    address: request.realIp,
                                });
                            }

                            ApplicationLogger.logBase(
                                LogLevel.WARNING,
                                request.worker,
                                user.id,
                                request.realIp,
                                request.url,
                                200,
                                'Successful login'
                            );
                        } else {
                            // Add 1 to signin attempts
                            await user.increment('attempts');
                            user.lastAttempt = new Date();
                            await user.save();
                            reply.status(401).send();

                            ApplicationLogger.logBase(
                                LogLevel.WARNING,
                                request.worker,
                                user.id,
                                request.realIp,
                                request.url,
                                401,
                                'Unsuccesful login'
                            );
                        }
                    }, waitTime);
                })
                .catch(async (error) => {
                    const logId = await ApplicationLogger.fatal(request, reply, error);
                    reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                });
        } else {
            reply.status(404).send();
            ApplicationLogger.logBase(
                LogLevel.WARNING,
                request.worker,
                null,
                request.realIp,
                request.url,
                404,
                'User not found'
            );
        }
    }

    async signup(request, reply) {
        // Validate request
        if (
            !request.body ||
            !request.body.name ||
            !request.body.surname ||
            !request.body.email ||
            !validator.isEmail(request.body.email) ||
            !request.body.password ||
            !validator.isHexadecimal(request.body.password) ||
            !request.body.country ||
            !request.body.preferences ||
            request.body.preferences.length < 3 ||
            hasDuplicates(request.body.preferences)
        ) {
            reply.status(400).send();
            return;
        }

        request.body.name = sanitize(request.body.name);
        request.body.surname = sanitize(request.body.surname);
        request.body.email = sanitize(request.body.email);
        request.body.password = sanitize(request.body.password);
        request.body.country = sanitize(request.body.country);

        // Get user
        var user = await db.User.findOne({
            where: {
                email: request.body.email,
            },
        });

        // If user exists, return not allowed
        if (user) {
            reply.status(403).send();
            ApplicationLogger.logBase(
                LogLevel.WARNING,
                request.worker,
                user.id,
                request.realIp,
                request.url,
                403,
                'User exists'
            );
            return;
        }

        // Validate and sanitize preferences
        const preferences = [];
        for (let i = 0; i < request.body.preferences.length; i++) {
            const category = categoriesCache.getByKey('id', request.body.preferences[i]);
            if (typeof request.body.preferences[i] != 'number' || !category) {
                reply.status(400).send();
                return;
            }

            preferences.push({
                CategoryId: category.id,
            });
        }

        // Get hash from password
        _hashPassword(request.body.password)
            .then(async (hash) => {
                // Create user
                user = await db.User.create({
                    name: request.body.name,
                    surname: request.body.surname,
                    email: request.body.email,
                    password: hash,
                    country: request.body.country,
                    lastAttempt: new Date(),
                });

                // Bulk create userViews
                const userViews = [];
                categoriesCache.getItems().forEach((category) => {
                    userViews.push({
                        UserId: user.id,
                        CategoryId: category.id,
                    });
                });
                await db.UserView.bulkCreate(userViews);

                // Bulk create preferences
                preferences.forEach((preference) => {
                    preference.UserId = user.id;
                });
                await db.UserCategory.bulkCreate(preferences);

                // Create session and send reply
                const session = await Session.createSession(
                    user.id,
                    request.realIp,
                    request.body.remember ? 1209600 : 86400
                );
                reply
                    .setCookie('hermesSession', session, {
                        path: '/',
                        signed: true,
                        maxAge: request.body.remember ? 1209600 : 86400,
                        sameSite: true,
                    })
                    .status(200)
                    .send();

                // Send welcome email
                mailServer.add(request.body.email, MailType.newAccount, {
                    name: request.body.name,
                });

                ApplicationLogger.logBase(
                    LogLevel.WARNING,
                    request.worker,
                    user.id,
                    request.realIp,
                    request.url,
                    200,
                    'Successful signup'
                );
            })
            .catch(async (err) => {
                try {
                    db.User.destroy({
                        where: {
                            id: user.id,
                        },
                        force: true,
                    });
                    user.destroy();
                } catch (e) {}
                const logId = await ApplicationLogger.fatal(request, reply, error);
                reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
            });
    }

    /**
     * REQUIRES SESSION!
     * Logs out a user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async logout(request, reply) {
        await ApplicationLogger.warning(request, reply, 'Logout');
        await Session.destroySession(request);
        reply.clearCookie('hermesSession', { path: '/' }).status(301).redirect('/signin/');
    }

    /**
     * REQUIRES SESSION!
     * Logs out all sessions except the current one.
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async logoutSessions(request, reply) {
        const user = await Session.getSessionUser(request);

        // If user does not exists, return not allowed
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Remove all sessions except this one
        await db.Session.destroy({
            where: {
                [Op.not]: {
                    key: request.unsignCookie(request.cookies.hermesSession).value,
                },
                UserId: user.id,
            },
        });

        // Remove all logins
        await db.Login.destroy({
            where: {
                UserId: user.id,
            },
        });

        reply.status(200).send();
        ApplicationLogger.warning(request, reply, 'Logout');
    }

    /**
     * Requests a password change
     * @param  {Request} request HTTP request
     * @param  {Reply}   reply   HTTP reply
     */
    async request(request, reply) {
        if (!request.body || !request.body.email || !validator.isEmail(request.body.email)) {
            reply.status(400).send();
            return;
        }

        request.body.email = sanitize(request.body.email);

        // Get user
        const user = await db.User.findOne({
            where: {
                email: request.body.email,
            },
        });

        if (user) {
            // Create token
            const key = _makeString(255);
            await db.PasswordRequest.create({
                key: key,
                UserId: user.id,
            });

            // Send email
            mailServer.add(user.email, MailType.passwordRequest, {
                name: user.name,
                token: key,
            });
        }
        reply.status(200).send();
        ApplicationLogger.logBase(
            LogLevel.WARNING,
            request.worker,
            user.id,
            request.realIp,
            request.url,
            user ? 200 : 403,
            'Requested reset'
        );
    }

    /**
     * Given a PasswordRequest token, changes the password
     * @param  {Request} request HTTP request
     * @param  {Reply}   reply   HTTP reply
     */
    async change(request, reply) {
        if (
            !request.body ||
            !request.body.token ||
            !request.body.password ||
            !validator.isHexadecimal(request.body.password)
        ) {
            reply.status(400).send();
            return;
        }

        request.body.token = sanitize(request.body.token);
        request.body.password = sanitize(request.body.password);

        // Get token
        const token = await db.PasswordRequest.findOne({
            where: {
                key: request.body.token,
            },
        });
        const user = token
            ? await db.User.findOne({
                  where: {
                      id: token.UserId,
                  },
              })
            : null;

        if (token && user && 900 > (new Date() - token.createdAt) / 1000) {
            // Get hash from password
            _hashPassword(request.body.password)
                .then(async (hash) => {
                    // Update user
                    user.password = hash;
                    await user.save();

                    // Remove all sessions
                    await db.Session.destroy({
                        where: {
                            UserId: user.id,
                        },
                    });

                    // Remove all login info
                    await db.Login.destroy({
                        where: {
                            UserId: user.id,
                        },
                    });

                    // Remove token
                    await token.destroy();
                    reply.status(200).send();

                    ApplicationLogger.logBase(
                        LogLevel.WARNING,
                        request.worker,
                        user.id,
                        request.realIp,
                        request.url,
                        200,
                        'Password changed'
                    );

                    // Send email
                    mailServer.add(user.email, MailType.passwordChange, {
                        name: user.name,
                    });
                })
                .catch(async (error) => {
                    const logId = await ApplicationLogger.logBase(
                        LogLevel.FATAL,
                        request.worker,
                        user.id,
                        request.realIp,
                        request.url,
                        500,
                        error
                    );
                    reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                });
        } else {
            reply.status(403).send();
            ApplicationLogger.logBase(
                LogLevel.WARNING,
                request.worker,
                user.id,
                request.realIp,
                request.url,
                403,
                'Unauthorized attempt to change password'
            );
        }
    }

    /**
     * REQUIRES SESSION!
     * Updates the password of a logged in user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async update(request, reply) {
        if (!request.body || !request.body.password || !validator.isHexadecimal(request.body.password)) {
            reply.status(400).send();
            return;
        }

        request.body.password = sanitize(request.body.password);

        // Get user
        const user = await Session.getSessionUser(request);
        if (user) {
            // Get hash from password
            _hashPassword(request.body.password)
                .then(async (hash) => {
                    // Update user
                    user.password = hash;
                    await user.save();

                    // Remove all sessions except this one
                    await db.Session.destroy({
                        where: {
                            [Op.not]: {
                                key: request.unsignCookie(request.cookies.hermesSession).value,
                            },
                            UserId: user.id,
                        },
                    });

                    // Remove all login info
                    await db.Login.destroy({
                        where: {
                            UserId: user.id,
                        },
                    });
                    reply.status(200).send();
                    ApplicationLogger.warning(request, reply, 'Password changed');

                    // Send email
                    mailServer.add(user.email, MailType.passwordChange, {
                        name: user.name,
                        address: request.realIp,
                    });
                })
                .catch(async (error) => {
                    const logId = await ApplicationLogger.fatal(request, reply, error);
                    reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                });
        } else {
            reply.status(403).send();
            ApplicationLogger.warning(request, reply, 'Unauthorized attempt to change password');
        }
    }

    /**
     * REQUIRES SESSION!
     * Deletes a user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async del(request, reply) {
        if (!request.body || !request.body.password || !validator.isHexadecimal(request.body.password)) {
            reply.status(400).send();
            return;
        }

        request.body.password = sanitize(request.body.password);

        // Get user
        const user = await Session.getSessionUser(request);

        // If user exists
        if (user) {
            // Check password
            _comparePassword(request.body.password, user.password)
                .then(async (value) => {
                    if (value) {
                        // First, delete sessions, then delete user from database
                        await db.Session.destroy({
                            where: {
                                UserId: user.id,
                            },
                        });
                        await db.User.destroy({
                            where: {
                                id: user.id,
                            },
                            //force: true,
                        });
                        reply.status(200).send();

                        ApplicationLogger.warning(request, reply, 'Deleted account');

                        // Send email
                        mailServer.add(user.email, MailType.confirmDelete, {
                            name: user.name,
                        });
                    } else {
                        reply.status(401).send();
                    }
                })
                .catch(async (error) => {
                    const logId = await ApplicationLogger.fatal(request, reply, error);
                    reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                });
        } else {
            reply.status(403).send();
            ApplicationLogger.warning(request, reply, 'Unauthorized attempt to delete user');
        }
    }
}

exports.Session = Session;
exports.AuthController = AuthController;
exports.AuthMiddleware = AuthMiddleware;
