/*jshint esversion: 8 */
const db = require('../db/models.js');
const Recommender = require('../recommender/index.js');
const validator = require('validator');
const { acceptedLanguage } = require('../utils/lang.js');
const { ApplicationLogger } = require('../logger/logger.js');
const { Cache } = require('../utils/cache.js');
const { hasDuplicates } = require('../utils/arrays.js');
const { MailType } = require('../mail/mail.js');
const { sanitize } = require('../utils/text.js');
const { Session } = require('./session.js');

//
// Init
//
// Cache categories in memory for validation performance reasons
// This Cache object is duplicated in memory because of auth.js
// but because there are not too many categories, duplicating should not
// be a problem.
var categoriesCache;

/*
 * Account Controller
 */
class AccountController {
    constructor(fastify) {
        // Init cache
        this._createCache();

        fastify.put('/api/account/update/account', this.updateAccount);
        fastify.put('/api/account/update/notifications', this.updateNotifications);
        fastify.get('/api/account/info', this.info);
        fastify.get('/api/account/download', this.download);
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
     * REQUIRES SESSION!
     * Update a user account
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP reply.
     */
    async updateAccount(request, reply) {
        // Validate and sanitize input
        if (
            !request.body ||
            !request.body.user ||
            !request.body.user.name ||
            !request.body.user.surname ||
            !request.body.user.email ||
            !request.body.user.lang ||
            request.body.user.name.length <= 0 ||
            request.body.user.surname.length <= 0 ||
            request.body.user.email.length <= 0 ||
            request.body.user.name.length > 127 ||
            request.body.user.surname.length > 127 ||
            request.body.user.email.length > 127 ||
            !acceptedLanguage(request.body.user.lang) ||
            !validator.isEmail(request.body.user.email) ||
            !request.body.preferences ||
            request.body.preferences.length < 3 ||
            hasDuplicates(request.body.preferences)
        ) {
            reply.status(400).send();
            return;
        }

        request.body.user.name = sanitize(request.body.user.name);
        request.body.user.surname = sanitize(request.body.user.surname);
        request.body.user.email = sanitize(request.body.user.email);

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Validate and parse preferences
        const preferences = [];
        for (let i = 0; i < request.body.preferences.length; i++) {
            const category = categoriesCache.getByKey('id', request.body.preferences[i]);
            if (typeof request.body.preferences[i] != 'number' || !category) {
                reply.status(400).send();
                return;
            }

            preferences.push({
                CategoryId: category.id,
                UserId: user.id,
            });
        }

        const currentEmail = user.email;

        // Update user
        user.name = request.body.user.name;
        user.surname = request.body.user.surname;
        user.email = request.body.user.email;
        user.lang = request.body.user.lang;
        await user.save();

        // Bulk create preferences
        await db.UserCategory.destroy({
            where: {
                UserId: user.id,
            },
        });
        await db.UserCategory.bulkCreate(preferences);

        // Generate new recommendations after preference change
        await Recommender.generateCBRecommendations(user);

        // Send reply
        reply.status(200).send();

        // Notify if email changed
        if (currentEmail != request.body.user.email) {
            mailServer.add(currentEmail, MailType.emailChange, {
                name: user.name,
                currentEmail: currentEmail,
                newEmail: request.body.user.email,
            }, user.lang);
            ApplicationLogger.warning(request, reply, 'Email changed from ' + currentEmail + ' to ' + request.body.user.email);
        }
    }

    /**
     * REQUIRES SESSION!
     * Update notification settings of a user account
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP reply.
     */
    async updateNotifications(request, reply) {
        // Validate and sanitize input
        if (
            !request.body ||
            request.body.ratings == undefined ||
            request.body.ratings == null ||
            typeof request.body.ratings != 'boolean' ||
            request.body.plans == undefined ||
            request.body.plans == null ||
            typeof request.body.plans != 'boolean' /*||
            request.body.features == undefined ||
            request.body.features == null ||
            typeof request.body.features != 'boolean'*/
        ) {
            reply.status(400).send();
            return;
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Update user
        user.notificationsPlans = request.body.plans;
        user.notificationsRatings = request.body.ratings;
        user.notificationsFeatures = request.body.features;
        await user.save();

        // Send reply
        reply.status(200).send();
    }

    /**
     * REQUIRES SESSION!
     * Get user info
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP reply.
     */
    async info(request, reply) {
        const userId = await Session.getSessionUserId(request);
        if (userId) {
            const user = await db.User.findOne({
                where: {
                    id: userId,
                },
            });

            reply.status(200).send({
                user: {
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    lang: user.lang,
                },
                notifications: {
                    plans: user.notificationsPlans,
                    ratings: user.notificationsRatings,
                    /*features: user.notificationsFeatures*/
                },
                preferences: (
                    await db.UserCategory.findAll({
                        attributes: ['CategoryId'],
                        where: {
                            UserId: userId,
                        },
                    })
                ).map((category) => {
                    return category.CategoryId;
                }),
            });
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * Download user data
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP reply.
     */
    async download(request, reply) {
        const user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        const getType = function (type) {
            switch (type) {
                case 1:
                    return 'Place';
                case 2:
                    return 'Start';
                case 3:
                    return 'Wait';
                case 4:
                    return 'Rest';
                case 5:
                    return 'Custom';
                default:
                    return 'Empty';
            }
        };

        // Get preferences
        const preferences = (
            await db.UserCategory.findAll({
                where: {
                    UserId: user.id,
                },
                include: [
                    {
                        model: db.Category,
                        attributes: ['name'],
                    },
                ],
            })
        ).map((preference) => {
            return preference.Category.name;
        });

        // Get ratings
        const ratings = (
            await db.Rating.findAll({
                where: {
                    UserId: user.id,
                },
                include: [
                    {
                        model: db.Place,
                        attributes: ['name'],
                    },
                ],
            })
        ).map((rating) => {
            return {
                place: rating.Place.name,
                rating: rating.rating,
            };
        });

        // Get plans
        const plans = (
            await db.Plan.findAll({
                where: {
                    UserId: user.id,
                },
                include: [
                    {
                        model: db.PlanItem,
                        include: [
                            {
                                model: db.Place,
                                attributes: ['name'],
                            },
                        ],
                    },
                ],
            })
        ).map((plan) => {
            return {
                name: plan.name,
                description: plan.description,
                startDate: plan.startDate,
                endDate: plan.endDate,
                startLon: plan.startLon,
                startLat: plan.startLat,
                items: plan.PlanItems.map((item) => {
                    return {
                        order: item.order,
                        day: item.day,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        timeSpent: item.timeSpent,
                        type: getType(item.type),
                        travelNext: item.travelNext,
                        notes: item.description,
                        place: item.Place ? item.Place.name : null,
                    };
                }),
            };
        });

        reply.status(200).send({
            exported: new Date(),
            user: {
                name: user.name,
                surname: user.surname,
                email: user.email,
            },
            preferences: preferences,
            ratings: ratings,
            plans: plans,
        });

        ApplicationLogger.info(request, reply, 'Data download requested');
    }
}

exports.AccountController = AccountController;
