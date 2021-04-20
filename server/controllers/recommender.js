/*jshint esversion: 8 */
const db = require('../db/models.js');
const { Op } = require('sequelize');
const { Session } = require('./session.js');
const Recommender = require('../recommender/index.js');

/*
 * Recommender Controller
 */
class RecommenderController {
    constructor(fastify) {
        fastify.get('/api/recommendations/get', this.get);
        fastify.post('/api/recommendations/get', this.get);
        fastify.get('/api/recommendations/request', this.request);
        fastify.get(
            '/api/recommendations/random',
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
            '/api/recommendations/random',
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
     * Get all the recommendations of a user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async get(request, reply) {
        const userId = await Session.getSessionUserId(request);
        const ignores = request.body && request.body.ignores ? request.body.ignores : [];
        if (!userId) {
            reply.status(403).send();
            return;
        }

        const places = (
            await db.Recommendation.findAll({
                attributes: { exclude: ['createdAt', 'deletedAt', 'updatedAt', 'from'] },
                where: {
                    UserId: userId,
                    PlaceId: {
                        [Op.notIn]: ignores,
                    },
                },
                include: [
                    {
                        model: db.Place,
                        include: [
                            {
                                model: db.Category,
                                attributes: ['name'],
                            },
                        ],
                    },
                ],
                order: [['probability', 'DESC']],
            })
        ).map(function (item) {
            if (item) {
                return {
                    address: item.Place.address,
                    city: item.Place.city,
                    country: item.Place.country,
                    description: item.Place.description,
                    facebook: item.Place.facebook,
                    fsqId: item.Place.fsqId,
                    gmapsUrl: item.Place.gmapsUrl,
                    id: item.Place.id,
                    images: item.Place.images,
                    instagram: item.Place.instagram,
                    lat: item.Place.lat,
                    lon: item.Place.lon,
                    name: item.Place.name,
                    osmId: item.Place.osmId,
                    phone: item.Place.phone,
                    placeUrl: item.Place.placeUrl,
                    postalCode: item.Place.postalCode,
                    state: item.Place.state,
                    timeSpent: item.Place.timeSpent,
                    tripadvisorUrl: item.Place.tripadvisorUrl,
                    twitter: item.Place.twitter,
                    wheelchair: item.Place.wheelchair,
                    wikidata: item.Place.wikidata,
                    wikipedia: item.Place.wikipedia,
                    categories: item.Place.Categories.map((category) => {
                        return category.name;
                    }),
                    probability: item.probability,
                    rating: item.Place.rating,
                };
            }
        });

        const random = (
            await db.Place.findAll({
                where: {
                    id: {
                        [Op.notIn]: places.map((place) => {
                            return place.id;
                        }),
                        [Op.notIn]: ignores,
                    },
                },
                include: [
                    {
                        model: db.Category,
                        attributes: ['name'],
                    },
                ],
                order: db.sequelize.random(),
                limit: 5,
            })
        ).map(function (item) {
            return {
                address: item.address,
                city: item.city,
                country: item.country,
                description: item.description,
                facebook: item.facebook,
                fsqId: item.fsqId,
                gmapsUrl: item.gmapsUrl,
                id: item.id,
                images: item.images,
                instagram: item.instagram,
                lat: item.lat,
                lon: item.lon,
                name: item.name,
                osmId: item.osmId,
                phone: item.phone,
                placeUrl: item.placeUrl,
                postalCode: item.postalCode,
                state: item.state,
                timeSpent: item.timeSpent,
                tripadvisorUrl: item.tripadvisorUrl,
                twitter: item.twitter,
                wheelchair: item.wheelchair,
                wikidata: item.wikidata,
                wikipedia: item.wikipedia,
                categories: item.Categories.map((category) => {
                    return category.name;
                }),
                probability: null,
                rating: item.rating,
            };
        });

        reply.status(200).send({
            places: places,
            random: random,
        });
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

        const places = (
            await db.Recommendation.findAll({
                attributes: { exclude: ['createdAt', 'deletedAt', 'updatedAt', 'from'] },
                where: {
                    UserId: userId,
                    PlaceId: {
                        [Op.notIn]: ignores,
                    },
                },
                include: [
                    {
                        model: db.Place,
                        include: [
                            {
                                model: db.Category,
                                attributes: ['name'],
                            },
                        ],
                    },
                ],
                order: db.sequelize.random(),
                limit: maxCount
            })
        ).map(function (item) {
            if (item) {
                return {
                    address: item.Place.address,
                    city: item.Place.city,
                    country: item.Place.country,
                    description: item.Place.description,
                    facebook: item.Place.facebook,
                    fsqId: item.Place.fsqId,
                    gmapsUrl: item.Place.gmapsUrl,
                    id: item.Place.id,
                    images: item.Place.images,
                    instagram: item.Place.instagram,
                    lat: item.Place.lat,
                    lon: item.Place.lon,
                    name: item.Place.name,
                    osmId: item.Place.osmId,
                    phone: item.Place.phone,
                    placeUrl: item.Place.placeUrl,
                    postalCode: item.Place.postalCode,
                    state: item.Place.state,
                    timeSpent: item.Place.timeSpent,
                    tripadvisorUrl: item.Place.tripadvisorUrl,
                    twitter: item.Place.twitter,
                    wheelchair: item.Place.wheelchair,
                    wikidata: item.Place.wikidata,
                    wikipedia: item.Place.wikipedia,
                    categories: item.Place.Categories.map((category) => {
                        return category.name;
                    }),
                    probability: item.probability,
                    rating: item.Place.rating,
                };
            }
        });

        reply.status(200).send({
            result: places,
        });
    }

    /**
     * REQUIRES SESSION!
     * Request new recommendations
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async request(request, reply) {
        const user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Create recommendations
        try {
            await Recommender.findNeighbors(user);
            await Recommender.generateCFRecommendations(user);
            await Recommender.generateCBRecommendations(user);
            reply.status(200).send();
        } catch (error) {
            const logId = await ApplicationLogger.fatal(request, reply, error);
            reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
            return;
        }
    }
}

exports.RecommenderController = RecommenderController;
