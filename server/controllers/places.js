/*jshint esversion: 8 */
const db = require('../db/models.js');
const { Op } = require('sequelize');
const { sanitize } = require('../utils/text.js');

/*
 * Places Controller
 */
class PlacesController {
    constructor(fastify) {
        fastify.post(
            '/api/places/random',
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
        //fastify.get("/api/places/get", this.places);
        fastify.get(
            '/api/places/info/:id',
            {
                config: {
                    rateLimit: {
                        max: 300,
                        timeWindow: '10m',
                    },
                },
            },
            this.info
        );
        fastify.get(
            '/api/places/search/:q',
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
        fastify.post(
            '/api/places/search/:q',
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
    }

    /**
     * Return 5 random places.
     * If `ignores` body param is set, returns 5 random places, excluding places in `ignores`.
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async random(request, reply) {
        const ignores = request.body && request.body.ignores ? request.body.ignores : [];
        var maxCount = 5;
        if(request.body && request.body.max) {
            if(request.body.max <= 0) {
                reply.status(400).send();
                return;
            }
            maxCount = Math.min(request.body.max, 5);
        }

        reply.status(200).send({
            places: (
                await db.Place.findAll({
                    attributes: ['id', 'name', 'description', 'wikipedia', 'placeUrl'],
                    where: {
                        id: { [Op.notIn]: ignores },
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
            ).map(function (item) {
                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    wikipedia: item.wikipedia,
                    placeUrl: item.placeUrl,
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
     * Return all places from database
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async places(request, reply) {
        reply.status(200).send({
            places: (
                await db.Place.findAll({
                    include: [
                        {
                            model: db.Category,
                            attributes: ['name', 'id'],
                        },
                    ],
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
                    categoriesId: item.Categories.map((category) => {
                        return category.id;
                    }),
                    rating: item.rating,
                };
            }),
        });
    }

    /**
     * REQUIRES SESSION!
     * Get info about a place
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async info(request, reply) {
        const id = parseInt(request.params.id);
        if (id < 1 || isNaN(id)) {
            reply.status(400).send();
            return;
        }
        var place = await db.Place.findOne({
            where: {
                id: id,
            },
            include: [
                {
                    model: db.Category,
                    attributes: ['name', 'id'],
                },
            ],
        });

        if (!place) {
            reply.status(404).send();
            return;
        }

        reply.status(200).send({
            place: {
                address: place.address,
                city: place.city,
                country: place.country,
                description: place.description,
                facebook: place.facebook,
                fsqId: place.fsqId,
                gmapsUrl: place.gmapsUrl,
                id: place.id,
                images: place.images,
                instagram: place.instagram,
                lat: place.lat,
                lon: place.lon,
                name: place.name,
                osmId: place.osmId,
                phone: place.phone,
                placeUrl: place.placeUrl,
                postalCode: place.postalCode,
                state: place.state,
                timeSpent: place.timeSpent,
                tripadvisorUrl: place.tripadvisorUrl,
                twitter: place.twitter,
                wheelchair: place.wheelchair,
                wikidata: place.wikidata,
                wikipedia: place.wikipedia,
                categories: place.Categories.map((category) => {
                    return category.name;
                }),
                categoriesId: place.Categories.map((category) => {
                    return category.id;
                }),
                rating: place.rating,
            },
        });
    }

    /**
     * REQUIRES SESSION!
     * Search a place by name
     * If `ignores` body param is set, returns excluding places in `ignores`.
     * If `max` body param is set, return the specified number of results, with a maximum of 25
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async search(request, reply) {
        const query = sanitize(request.params.q).replace(' ', '%');
        if(query.length <= 0 || query.length > 127) {
            reply.status(400).send();
            return;
        }

        const ignores = request.body ? request.body.ignores || [] : [];
        var maxCount = 25;
        if(request.body && request.body.max) {
            if(request.body.max <= 0) {
                reply.status(400).send();
                return;
            }
            maxCount = Math.min(request.body.max, 25);
        }

        // Find places
        var result = (
            await db.Place.findAll({
                where: {
                    name: {
                        [Op.like]: '%' + query + '%',
                    },
                    id: {
                        [Op.notIn]: ignores,
                    },
                },
                include: [
                    {
                        model: db.Category,
                        attributes: ['name', 'id'],
                    },
                ],
                limit: maxCount,
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
                categoriesId: item.Categories.map((category) => {
                    return category.id;
                }),
                rating: item.rating,
            };
        });

        // Find places in categories
        var places = await db.Place.findAll({
            attributes: ['id'],
            where: {
                id: {
                    [Op.notIn]: ignores,
                    [Op.notIn]: result.map((place) => {
                        return place.id;
                    }),
                },
            },
            limit: maxCount,
            include: [
                {
                    model: db.Category,
                    where: {
                        name: {
                            [Op.like]: '%' + query + '%',
                        },
                    },
                },
            ],
        });

        for (var i = 0; i < places.length; i++) {
            if(result.length >= maxCount) {
                break;
            }

            const place = places[i];
            const item = await db.Place.findOne({
                where: {
                    id: place.id,
                },
                include: [
                    {
                        attributes: ['name', 'id'],
                        model: db.Category,
                    },
                ],
            });

            result.push({
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
                categoriesId: item.Categories.map((category) => {
                    return category.id;
                }),
                rating: item.rating,
            });
        }

        reply.status(200).send({
            result: result,
        });
    }
}

exports.PlacesController = PlacesController;
