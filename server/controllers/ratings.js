/*jshint esversion: 8 */
const db = require('../db/models.js');
const { Op } = require('sequelize');
const { sanitize } = require('../utils/text.js');
const { Session } = require('./session.js');
/*
 * Ratings Controller
 */
class RatingsController {
    constructor(fastify) {
        fastify.get('/api/ratings/get', this.get);
        fastify.post('/api/ratings/create', this.create);
        fastify.post('/api/ratings/delete', this.del);
        fastify.get(
            '/api/ratings/search/:q',
            {
                config: {
                    rateLimit: {
                        max: 300,
                        timeWindow: '10m',
                    },
                },
            },
            this.search
        );
        fastify.get(
            '/api/ratings/random',
            {
                config: {
                    rateLimit: {
                        max: 300,
                        timeWindow: '10m',
                    },
                },
            },
            this.random
        );
        fastify.post(
            '/api/ratings/random',
            {
                config: {
                    rateLimit: {
                        max: 300,
                        timeWindow: '10m',
                    },
                },
            },
            this.random
        );
    }

    /**
     * REQUIRES SESSION!
     * Get the ratings of a user, split by rated and pending
     * TODO: If zone gets implemented, filter by query param
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async get(request, reply) {
        const userId = await Session.getSessionUserId(request);

        if (userId) {
            // Get ratings of user
            const places = [];
            const done = await db.Rating.findAll({
                attributes: ['rating'],
                where: {
                    UserId: userId,
                },
                include: [
                    {
                        model: db.Place,
                        attributes: ['id', 'name', 'description', 'wikipedia', 'placeUrl', 'images'],
                    },
                ],
            });
            done.forEach((place) => places.push(place.Place.id));

            // Get pending, filtering ratings
            const pending = await db.PlanItem.findAll({
                attributes: [],
                where: {
                    PlaceId: {
                        [Op.not]: null,
                        [Op.notIn]: places,
                    },
                },
                include: [
                    {
                        model: db.Place,
                        attributes: ['id', 'name', 'description', 'wikipedia', 'placeUrl', 'images'],
                    },
                    {
                        model: db.Plan,
                        where: {
                            UserId: userId,
                        },
                    },
                ],
            });

            reply.status(200).send({
                done: done.map((item) => {
                    return {
                        id: item.Place.id,
                        name: item.Place.name,
                        description: item.Place.description,
                        wikipedia: item.Place.wikipedia,
                        placeUrl: item.Place.placeUrl,
                        images: item.Place.images,
                        rating: item.rating,
                    };
                }),
                pending: pending
                    .map((item) => {
                        return {
                            id: item.Place.id,
                            name: item.Place.name,
                            description: item.Place.description,
                            wikipedia: item.Place.wikipedia,
                            placeUrl: item.Place.placeUrl,
                            images: item.Place.images,
                        };
                    })
                    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i),
            });
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * Create a new rating for the user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async create(request, reply) {
        if (
            !request.body ||
            !request.body.placeId ||
            typeof request.body.placeId != 'number' ||
            !request.body.rating ||
            typeof request.body.rating != 'number' ||
            request.body.rating < 1 ||
            request.body.rating > 5
        ) {
            reply.status(400).send();
            return;
        }

        const user = await Session.getSessionUser(request);
        const place = await db.Place.findOne({
            where: {
                id: request.body.placeId,
            },
            include: [
                {
                    model: db.Category,
                    attributes: ['id'],
                },
            ],
        });

        if (!place) {
            reply.status(404).send();
            return;
        }

        const rating = await db.Rating.findOne({
            where: {
                PlaceId: request.body.placeId,
                UserId: user.id,
            },
        });

        if (rating) {
            reply.status(400).send();
            return;
        }

        if (user) {
            // Create rating
            await db.Rating.create({
                PlaceId: place.id,
                UserId: user.id,
                rating: request.body.rating,
            });

            // Find UserViews that match the categories of the place
            (
                await db.UserView.findAll({
                    where: {
                        UserId: user.id,
                        CategoryId: {
                            [Op.in]: place.Categories.map((category) => {
                                return category.id;
                            }),
                        },
                    },
                })
            ).forEach(async (userView) => {
                // Increment each view by one
                userView.views += 1;
                user.views += 1;
                await userView.save();
            });
            await user.save();

            place.rating = (place.rating * place.count + request.body.rating) / (place.count + 1);
            place.count += 1;
            await place.save();

            reply.status(200).send();
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * Delete a rating
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async del(request, reply) {
        if (!request.body || !request.body.placeId || typeof request.body.placeId != 'number') {
            reply.status(400).send();
            return;
        }

        const user = await Session.getSessionUser(request);
        if (user) {
            const rating = await db.Rating.findOne({
                where: {
                    PlaceId: request.body.placeId,
                    UserId: user.id,
                },
                include: [
                    {
                        model: db.Place,
                    },
                ],
            });

            if (!rating) {
                reply.status(404).send();
                return;
            }

            const place = await db.Place.findOne({
                where: {
                    id: rating.PlaceId,
                },
                include: [
                    {
                        model: db.Category,
                        include: [
                            {
                                model: db.UserView,
                                where: {
                                    UserId: user.id,
                                },
                            },
                        ],
                    },
                ],
            });

            for (var i = 0; i < place.Categories.length; i++) {
                place.Categories[i].UserViews[0].decrement('views');
                await place.Categories[i].UserViews[0].save();
            }
            user.views = user.views - place.Categories.length;
            await user.save();

            if (place.count > 1) {
                place.rating = (place.rating * place.count - rating.rating) / (place.count - 1);
                place.count = place.count - 1;
            } else {
                place.rating = 0;
                place.count = 0;
            }
            await place.save();

            rating.destroy();

            reply.status(200).send();
        } else {
            reply.status(403).send();
        }
    }

    async random(request, reply) {
        const userId = await Session.getSessionUserId(request);
        const ignores = request.body && request.body.ignores ? request.body.ignores : [];

        if (!userId) {
            reply.status(403).send();
            return;
        }

        var maxCount = 5;
        if(request.body && request.body.max) {
            if(request.body.max <= 0) {
                reply.status(400).send();
                return;
            }
            maxCount = Math.min(request.body.max, 5);
        }

        const rated = (
            await db.Rating.findAll({
                attributes: ['PlaceId'],
                where: {
                    UserId: userId,
                },
            })
        ).map(function (item) {
            return item.PlaceId;
        });

        reply.status(200).send({
            result: (
                await db.Place.findAll({
                    attributes: ['id', 'name', 'description', 'wikipedia', 'placeUrl', 'images'],
                    where: {
                        id: {
                            [Op.notIn]: ignores,
                            [Op.notIn]: rated,
                        },
                    },
                    include: [
                        {
                            model: db.Category,
                            attributes: ['name', 'id'],
                        },
                    ],
                    order: db.sequelize.random(),
                    limit: maxCount,
                })
            ).map((item) => {
                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    wikipedia: item.wikipedia,
                    placeUrl: item.placeUrl,
                    images: item.images,
                    categories: item.Categories.map((category) => {
                        return category.name;
                    }),
                    categoriesId: item.Categories.map((category) => {
                        return category.id;
                    }),
                };
            }),
        });
    }

    /**
     * REQUIRES SESSION!
     * Search places excluding already rated by the user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async search(request, reply) {
        const query = sanitize(request.params.q).replace(' ', '%');
        if(query.length <= 0 || query.length > 127) {
            reply.status(400).send();
            return;
        }
        
        const userId = await Session.getSessionUserId(request);

        if (!userId) {
            reply.status(403).send();
            return;
        }

        const rated = (
            await db.Rating.findAll({
                attributes: ['PlaceId'],
                where: {
                    UserId: userId,
                },
            })
        ).map(function (item) {
            return item.PlaceId;
        });

        reply.status(200).send({
            result: (
                await db.Place.findAll({
                    attributes: ['id', 'name', 'description', 'wikipedia', 'placeUrl', 'images'],
                    where: {
                        name: {
                            [Op.like]: '%' + query + '%',
                        },
                        id: {
                            [Op.notIn]: rated,
                        },
                    },
                    include: [
                        {
                            model: db.Category,
                            attributes: ['name'],
                        },
                    ],
                })
            ).map((item) => {
                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    wikipedia: item.wikipedia,
                    placeUrl: item.placeUrl,
                    images: item.images,
                    categories: item.Categories.map((category) => {
                        return category.name;
                    }),
                };
            }),
        });
    }
}

exports.RatingsController = RatingsController;
