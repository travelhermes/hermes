/*jshint esversion: 8 */
const db = require('../db/models.js');
const geolib = require('geolib');
const { hasDuplicates } = require('../utils/arrays.js');
const { Op } = require('sequelize');
const { sanitize } = require('../utils/text.js');
const { Session } = require('./session.js');
const Planner = require('../planner/index.js');

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

/**
 * Get an array of dates between startDate and stopDate, including
 * @param  {Date}        startDate Starting date
 * @param  {Date}        stopDate  Ending date
 * @return {Array<Date>}           Array of dates
 */
function getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}

/**
 * Convert week day from Sun 0 - Sat 6 to Mon 1 - Sun 7
 * @param  {Date}   date Date to get week day from
 * @return {number}      Converted value
 */
function getDay(date) {
    var day = date.getDay();
    if (day == 0) {
        day = 7;
    }

    return day;
}

/**
 * Convert hhmm or hh:mm format to minutes format, where 00:00 equals 0
 * @param  {string} time String to get time from
 * @return {number}      Converted value
 */
function getTime(time) {
    var result = 0;
    time = time.replace(':', '');
    if (time[0] == '+') {
        time = time.substring(1);
        result = 1440;
    }
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2));
    result += hour * 60 + minutes;
    return result;
}

/**
 * Convert minutes format to hh:mm, where 0 equals 00:00
 * @param  {number} time Number to get time from
 * @return {string}      Converted value
 */
function getTimeString(time) {
    var hours = Math.floor(time / 60);
    var minutes = Math.ceil((time / 60 - hours) * 60);
    while (minutes >= 60) {
        minutes -= 60;
        hours++;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get distance between two places. If places are not in database, returns distance between coordinates.
 * @param  {Place} place1 First place
 * @param  {Place} place2 Second place
 * @return {Array}        Returns [distance in meters, time in minutes]. [0,0] if no latitude and longitude is provided
 */
function getDistance(place1, place2) {
    return new Promise((resolve, reject) => {
        if ((!place1.lat && !place1.lon) || (!place2.lat && !place2.lon)) {
            resolve([0, 0, 'walking']);
            return;
        }
        if (typeof place1.id != 'number' || typeof place2.id != 'number') {
            // Multiply by a ratio, which is the average of ratios between db distance and coord distance
            // Should be changed to Graphhopper Routing API/Google Maps Routing API
            // however, Graphhopper doesn't work on ARM and Google Maps is crazy expensive
            var dist =
                geolib.getDistance(
                    { latitude: place1.lat, longitude: place1.lon },
                    { latitude: place2.lat, longitude: place2.lon }
                ) * 1.2383493909051912;
            var time = dist / 84; // Walking = 1.4m/s = 84 m/min

            if (time > 60) {
                time = dist / 830; // Driving = 50km/h = ~830 m/min
                resolve([dist, time, 'car']);
                return;
            }

            resolve([dist, time, 'walking']);
            return;
        }
        db.Distance.findOne({
            where: {
                [Op.or]: [
                    {
                        [Op.and]: [
                            {
                                PlaceId1: place1.id,
                            },
                            {
                                PlaceId2: place2.id,
                            },
                        ],
                    },
                    {
                        [Op.and]: [
                            {
                                PlaceId1: place2.id,
                            },
                            {
                                PlaceId2: place1.id,
                            },
                        ],
                    },
                ],
            },
        })
            .then((res) => {
                resolve([res.meters, res.time, res.mode]);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Compute days between two dates
 * @param  {Date | string}  date1 First date.
 * @param  {Date | string}  date2 Second date.
 * @param  {Boolean} abs    If true, return is always > 0
 * @return {number}         Number of days between date1 and date2
 */
function daysBetween(date1, date2, abs = true) {
    if (typeof date1 == 'string') {
        date1 = new Date(date1);
    }
    if (typeof date2 == 'string') {
        date2 = new Date(date2);
    }
    // The number of milliseconds in one day
    const ONE_DAY = 1000 * 60 * 60 * 24;

    // Calculate the difference in milliseconds
    const differenceMs = abs ? Math.abs(date2 - date1) : date2 - date1;

    // Convert back to days and return
    return Math.round(differenceMs / ONE_DAY);
}

/*
 * Planner Controller
 */
class PlannerController {
    constructor(fastify) {
        // Plan creation Ops
        fastify.post('/api/plans/create', this.create);
        fastify.get('/api/plans/status/:id', this.status);
        fastify.post('/api/plans/length', this.length);

        // Plan ops
        fastify.get('/api/plans/list', this.list);
        fastify.post('/api/plans/get', this.get);
        fastify.post('/api/plans/delete', this.del);
        fastify.put('/api/plans/update', this.update);
    }

    /**
     * REQUIRES SESSION!
     * Create a new plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async create(request, reply) {
        // Validate request
        if (
            !request.body ||
            !request.body.name ||
            !request.body.places ||
            hasDuplicates(request.body.places) ||
            !request.body.startDate ||
            !request.body.endDate ||
            typeof request.body.dayStart != 'number' ||
            typeof request.body.dayEnd != 'number' ||
            !request.body.start ||
            !request.body.start.lat ||
            !request.body.start.lon
        ) {
            reply.status(400).send();
            return;
        }

        if (request.body.dayStart > request.body.dayEnd) {
            reply.status(400).send();
            return;
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        request.body.startDate = new Date(request.body.startDate);
        request.body.endDate = new Date(request.body.endDate);
        request.body.name = sanitize(request.body.name);
        request.body.description = sanitize(request.body.description);
        request.body.start.id = 'start';

        if (request.body.startDate > request.body.endDate) {
            reply.status(400).send();
            return;
        }

        var places = await db.Place.findAll({
            attributes: ['id', 'timeSpent', 'lat', 'lon'],
            where: {
                id: { [Op.in]: request.body.places },
            },
            include: [
                {
                    model: db.Hour,
                    attributes: ['day', 'monthStart', 'monthEnd', 'timeStart', 'timeEnd'],
                },
            ],
        });
        if (places.length != request.body.places.length) {
            reply.status(400).send();
            return;
        }

        var days = getDates(request.body.startDate, request.body.endDate);
        places = places.map((place) => {
            var hours = [];
            for (var i = 0; i < place.Hours.length; i++) {
                for (var j = 0; j < days.length; j++) {
                    if (place.Hours[i].day == getDay(days[j])) {
                        hours.push({
                            day: days[j],
                            monthStart: place.Hours[i].monthStart,
                            monthEnd: place.Hours[i].monthEnd,
                            timeStart: place.Hours[i].timeStart,
                            timeEnd: place.Hours[i].timeEnd,
                        });
                    }
                }
            }

            return {
                id: place.id,
                timeSpent: place.timeSpent,
                hours: hours,
                lat: place.lat,
                lon: place.lon,
            };
        });

        var plan = await db.Plan.create({
            UserId: user.id,
            name: request.body.name,
            description: request.body.description || '',
            startDate: request.body.startDate,
            endDate: request.body.endDate,
            dayStart: request.body.dayStart,
            dayEnd: request.body.dayEnd,
            startLat: request.body.start.lat,
            startLon: request.body.start.lon,
        });

        Planner.plan(
            plan,
            places,
            days,
            request.body.start,
            request.body.dayStart,
            request.body.dayEnd,
            request.body.quicker
        );
        reply.status(200).send({ id: plan.id });
    }

    /**
     * REQUIRES SESSION!
     * Check the status of an existing plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async status(request, reply) {
        // Validate request
        const id = parseInt(request.params.id);
        if (id <= 0 || isNaN(id)) {
            reply.status(400).send();
            return;
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        var plan = await db.Plan.findOne({
            where: {
                id: id,
                UserId: user.id,
            },
        });

        if (plan) {
            reply.status(200).send({ status: plan.status });
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * List all the plans of a user
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async list(request, reply) {
        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        var active = (
            await db.Plan.findAll({
                where: {
                    UserId: user.id,
                    endDate: {
                        [Op.gte]: new Date(),
                    },
                },
                order: [['startDate', 'ASC']],
            })
        ).map((plan) => {
            return {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                startDate: plan.startDate,
                endDate: plan.endDate,
                status: plan.status,
            };
        });
        var past = (
            await db.Plan.findAll({
                where: {
                    UserId: user.id,
                    endDate: {
                        [Op.lt]: new Date(),
                    },
                },
                order: [['startDate', 'ASC']],
            })
        ).map((plan) => {
            return {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                startDate: plan.startDate,
                endDate: plan.endDate,
                status: plan.status,
            };
        });

        reply.status(200).send({ active: active, past: past });
    }

    /**
     * REQUIRES SESSION!
     * Get a plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async get(request, reply) {
        // Validate request
        if (!request.body || !request.body.id || typeof request.body.id != 'number') {
            reply.status(400).send();
            return;
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Get and validate plan
        var plan = await db.Plan.findOne({
            where: {
                id: request.body.id,
                UserId: user.id,
            },
            include: [
                {
                    model: db.PlanItem,
                    include: [
                        {
                            model: db.Place,
                        },
                    ],
                    order: [
                        ['day', 'ASC'],
                        ['order', 'ASC'],
                    ],
                },
            ],
        });

        if (plan) {
            reply.status(200).send({
                plan: {
                    id: plan.id,
                    status: plan.status,
                    name: plan.name,
                    description: plan.description,
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                    startLat: plan.startLat,
                    startLon: plan.startLon,
                    dayStart: plan.dayStart,
                    dayEnd: plan.dayEnd,
                },
                items: plan.PlanItems.map((item) => {
                    return {
                        id: item.id,
                        placeId: item.Place ? item.Place.id : null,
                        placeName: item.Place ? item.Place.name : null,
                        placeDescription: item.Place ? item.Place.description : null,
                        placeMaps: item.Place ? item.Place.gmapsUrl : null,
                        placeImages: item.Place ? item.Place.images : null,
                        placeWikipedia: item.Place ? item.Place.wikipedia : null,
                        placeUrl: item.Place ? item.Place.placeUrl : null,
                        order: item.order,
                        day: item.day,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        type: item.type,
                        timeSpent: item.timeSpent,
                        travelNext: item.travelNext,
                        travelMode: item.travelMode,
                        description: item.description,
                    };
                }),
            });
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * Delete a plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async del(request, reply) {
        // Validate request
        if (!request.body || !request.body.id || typeof request.body.id != 'number') {
            reply.status(400).send();
            return;
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Get and validate plan
        var plan = await db.Plan.findOne({
            where: {
                id: request.body.id,
                UserId: user.id,
            },
        });

        if (plan) {
            await plan.destroy();
            reply.status(200).send();
        } else {
            reply.status(403).send();
        }
    }

    /**
     * REQUIRES SESSION!
     * Update an existing plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async update(request, reply) {
        // Validate request
        if (
            !request.body ||
            !request.body.plan ||
            !request.body.items ||
            !request.body.plan.id ||
            typeof request.body.plan.id != 'number' ||
            !request.body.plan.name ||
            typeof request.body.plan.name != 'string' ||
            !request.body.plan.startDate
        ) {
            reply.status(400).send();
            return;
        }

        request.body.plan.name = sanitize(request.body.plan.name);
        request.body.plan.description = sanitize(request.body.plan.description);
        request.body.plan.startDate = new Date(request.body.plan.startDate);

        // Sort array
        request.body.items.sort(function (a, b) {
            if (a.day === b.day) {
                return a.order - b.order;
            }
            return a.day - b.day;
        });

        for (let i = 0; i < request.body.items.length; i++) {
            if (
                typeof request.body.items[i].order != 'number' ||
                typeof request.body.items[i].day != 'number' ||
                !request.body.items[i].type ||
                typeof request.body.items[i].type != 'number' ||
                typeof request.body.items[i].timeSpent != 'number' ||
                (request.body.items[i].type != 2 && request.body.items[i].timeSpent < 15)
            ) {
                reply.status(400).send();
                return;
            }

            request.body.items[i].description = sanitize(request.body.items[i].description);

            if (request.body.items[i].type == 2 && request.body.items[i].order != 0) {
                reply.status(400).send();
                return;
            }
        }

        // Get user
        var user = await Session.getSessionUser(request);
        if (!user) {
            reply.status(403).send();
            return;
        }

        // Get and validate plan
        var plan = await db.Plan.findOne({
            where: {
                id: request.body.plan.id,
                UserId: user.id,
            },
        });

        if (!plan) {
            reply.status(403).send();
            return;
        }

        if (plan.endDate.addDays(1) < new Date()) {
            reply.status(400).send();
            return;
        }

        var days = request.body.items.map((e) => {
            return e.day;
        });
        if (daysBetween(plan.startDate, plan.endDate) + 1 != new Set(days).size) {
            reply.status(400).send();
            return;
        }

        // Update plan
        var startDate = request.body.plan.startDate;
        var endDate = plan.endDate.addDays(daysBetween(plan.startDate, startDate, false));
        plan.name = request.body.plan.name;
        plan.description = request.body.plan.description;
        plan.startDate = startDate;
        plan.endDate = endDate;

        // Remove previous PlaceItem's
        await db.PlanItem.destroy({
            where: {
                PlanId: plan.id,
            },
        });

        // Fetch startTime, endTime and travelNext
        var currentTime = plan.dayStart || 540;
        var currentDay = -1;
        var currentOrder = -1;
        var items = [];
        for (let i = 0; i < request.body.items.length; i++) {
            const item = request.body.items[i];
            var prev = request.body.items[i - 1] ? request.body.items[i - 1] : null;
            var next = request.body.items[i + 1] ? request.body.items[i + 1] : null;

            if (prev && prev.type == 1) {
                prev = await db.Place.findOne({
                    where: {
                        id: prev.PlaceId,
                    },
                });
                if (!prev) {
                    reply.status(400).send();
                    return;
                }
                prev.timeSpent = request.body.items[i - 1].timeSpent;
            }

            if (next && next.type == 1) {
                next = await db.Place.findOne({
                    where: {
                        id: next.PlaceId,
                    },
                });
                if (!next) {
                    reply.status(400).send();
                    return;
                }
                next.timeSpent = request.body.items[i + 1].timeSpent;
            }

            if (item.type == 2) {
                item.id = 'start';
                item.lat = plan.startLat;
                item.lon = plan.startLon;
            }

            if (item.order == 0) {
                currentTime = plan.dayStart || 540;
                currentDay++;
                currentOrder = 0;
            }

            if (item.type == 1) {
                var place = await db.Place.findOne({
                    where: {
                        id: item.PlaceId,
                    },
                });
                if (!place) {
                    reply.status(400).send();
                    return;
                }

                let dist = [0, 0, 'walking'];
                if (next) {
                    try {
                        dist = await getDistance(place, next);
                    } catch (error) {
                        const logId = await ApplicationLogger.fatal(request, reply, error);
                        reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                        return;
                    }
                }

                items.push({
                    PlanId: plan.id,
                    PlaceId: place.id,
                    order: currentOrder,
                    day: currentDay,
                    startTime: getTimeString(currentTime),
                    endTime: getTimeString(currentTime + item.timeSpent),
                    timeSpent: item.timeSpent,
                    type: 1,
                    travelNext: next && request.body.items[i + 1].day == item.day ? dist[1] : -1,
                    travelMode: dist[2],
                    description: item.description,
                });

                currentTime = currentTime + item.timeSpent + dist[1];
            } else if (item.type == 2) {
                let dist = [0, 0, 'walking'];
                if (next) {
                    try {
                        dist = await getDistance(item, next);
                    } catch (error) {
                        const logId = await ApplicationLogger.fatal(request, reply, error);
                        reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                        return;
                    }
                }

                items.push({
                    PlanId: plan.id,
                    PlaceId: null,
                    order: currentOrder,
                    day: currentDay,
                    startTime: getTimeString(currentTime),
                    endTime: getTimeString(currentTime),
                    timeSpent: 0,
                    type: 2,
                    travelNext: next && request.body.items[i + 1].day == item.day ? dist[1] : -1,
                    travelMode: dist[2],
                    description: item.description,
                });

                currentTime = currentTime + dist[1];
            } else {
                let dist = [0, 0, 'walking'];
                if (prev && next) {
                    try {
                        dist = await getDistance(prev, next);
                    } catch (error) {
                        const logId = await ApplicationLogger.fatal(request, reply, error);
                        reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                        return;
                    }
                }

                items.push({
                    PlanId: plan.id,
                    PlaceId: null,
                    order: currentOrder,
                    day: currentDay,
                    startTime: getTimeString(currentTime),
                    endTime: getTimeString(currentTime + item.timeSpent),
                    timeSpent: item.timeSpent,
                    type: item.type,
                    travelNext: next && request.body.items[i + 1].day == item.day ? dist[1] : -1,
                    travelMode: dist[2],
                    description: item.description,
                });

                currentTime = currentTime + item.timeSpent + dist[1];
            }

            currentOrder++;
        }

        try {
            await db.PlanItem.bulkCreate(items);
        } catch (error) {
            const logId = await ApplicationLogger.fatal(request, reply, error);
            reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
            return;
        }
        await plan.save();
        reply.status(200).send();
    }

    /**
     * REQUIRES SESSION!
     * Get the recommended minumum length of a plan
     * @param  {Request} request HTTP Request
     * @param  {Reply}   reply   HTTP Reply
     */
    async length(request, reply) {
        // Validate request
        if (
            !request.body ||
            !request.body.places ||
            hasDuplicates(request.body.places) ||
            request.body.places.length < 3 ||
            !request.body.dayStart ||
            typeof request.body.dayStart != 'number' ||
            !request.body.dayEnd ||
            typeof request.body.dayEnd != 'number' ||
            !request.body.start ||
            !request.body.start.lat ||
            !request.body.start.lon
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

        request.body.start.id = 'start';

        // Get places and validate
        var places = await db.Place.findAll({
            attributes: ['id', 'timeSpent', 'lat', 'lon'],
            where: {
                id: { [Op.in]: request.body.places },
            },
            include: [
                {
                    model: db.Hour,
                    attributes: ['day', 'monthStart', 'monthEnd', 'timeStart', 'timeEnd'],
                },
            ],
        });
        if (places.length != request.body.places.length) {
            reply.status(400).send();
            return;
        }

        // Get available time in a day
        var dayAvailable = request.body.dayEnd - request.body.dayStart;

        // Calculate times and averages of travel times
        var count = 0;
        var timeSpent = 0;
        var timeTravel = 0;
        var dist;
        for (var i = 0; i < places.length; i++) {
            timeSpent += places[i].timeSpent;
            for (var j = i + 1; j < places.length; j++) {
                try {
                    dist = await getDistance(places[i], places[j]);
                } catch (error) {
                    const logId = await ApplicationLogger.fatal(request, reply, error);
                    reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                    return;
                }
                timeTravel += dist[1];
                count++;
            }

            // Calculate times to start and end
            try {
                dist = await getDistance(request.body.start, places[i]);
            } catch (error) {
                const logId = await ApplicationLogger.fatal(request, reply, error);
                reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
                return;
            }
            timeTravel += dist[1] * 2;
            count += 2;
        }

        // Calculate days
        var time = (timeTravel / count) * places.length + timeSpent;
        var days = Math.ceil(time / dayAvailable);

        reply.status(200).send({ days: days });
    }
}

exports.PlannerController = PlannerController;
