/* jshint esversion: 8 */
const db = require('../db/models.js');
const { Op } = require('sequelize');
const { mpipUsers, cfPrediction, cbPrediction } = require('../hermes-rust/index.js');

const CF_THRESHOLD = 3;
const CB_THRESHOLD = 0.5;

/**
 * Finds a user's nearest neighbors based on PSS, and ratings
 * @param  {number} userId User to find neighbors for
 * @param  {number} n      Size of Top-N
 * @param  {number} r      Number of users in DB to lookup
 */
exports.findNeighbors = async function (user, n = 10, r = 5) {
    const userId = user.id;

    // Get user's rated places
    const rated = {};
    const ratings = await db.Rating.findAll({
        where: {
            UserId: userId,
        },
    });
    for (let i = 0; i < ratings.length; i++) {
        const rating = ratings[i];
        rated[rating.PlaceId] = rating.rating;
    }

    // Get random users along with coinciding places
    const users = await db.User.findAll({
        attributes: ['id'],
        where: {
            id: { [Op.not]: userId },
        },
        include: [
            {
                model: db.Rating,
                where: {
                    PlaceId: {
                        [Op.in]: Object.keys(rated).map((id) => {
                            return parseInt(id);
                        }),
                    },
                },
                include: [
                    {
                        model: db.Place,
                        attributes: ['rating'],
                    },
                ],
            },
        ],
        order: db.sequelize.random(),
        limit: n * r,
    });

    // Compute similarity for every random user, excluding users with
    // less than THRESHOLD similarity
    var similarity = [];
    for (let i = 0; i < users.length; i++) {
        const neighborRatings = [];
        const userRatings = [];
        const averageRatings = [];
        for (let j = 0; j < users[i].Ratings.length; j++) {
            const rating = users[i].Ratings[j];
            neighborRatings.push(rating.rating);
            userRatings.push(rated[rating.PlaceId]);
            averageRatings.push(rating.Place.rating);
        }

        const s = mpipUsers(neighborRatings, userRatings, averageRatings);
        similarity.push({
            userId: users[i].id,
            similarity: s,
        });
    }

    // Sort and get first N
    similarity.sort((a, b) => {
        return b.similarity - a.similarity;
    });
    similarity = similarity.slice(0, n);

    await db.Neighbor.destroy({
        where: {
            UserId1: userId,
        },
    });

    // Add or remove neighbors
    for (let i = 0; i < similarity.length; i++) {
        const neighbor = similarity[i];
        db.Neighbor.create({
            UserId1: userId,
            UserId2: neighbor.userId,
            similarity: neighbor.similarity,
        });
    }

    user.lastNeighbor = new Date();
    await user.save();
};

/**
 * Generates recommendations using Collaborative Filtering, neighbors and ratings
 * @param  {User} user User for whom recommendations will be generated
 */
exports.generateCFRecommendations = async function (user) {
    var ratings = {};
    var places = [];
    var similarity = [];
    const userId = user.id;

    // Compute user rating average
    var avg = 0;
    var count = 0;
    (
        await db.Rating.findAll({
            attributes: ['rating'],
            where: {
                UserId: userId,
            },
        })
    ).forEach((rating) => {
        avg += rating.rating;
        count++;
    });
    var userAvg = count != 0 ? avg / count : 3;

    // Get neighbors
    var neighbors = await db.Neighbor.findAll({
        attributes: ['UserId2', 'similarity'],
        where: {
            UserId1: userId,
        },
    });

    for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        avg = 0;
        count = 0;
        var neighborRatings = await db.Rating.findAll({
            where: {
                UserId: neighbor.UserId2,
            },
            include: [
                {
                    model: db.Place,
                    attributes: ['rating'],
                },
            ],
        });

        // Get neighbor average rating
        for (var j = 0; j < neighborRatings.length; j++) {
            const rating = neighborRatings[j];
            avg += rating.rating;
            count++;

            // Create keys if needed
            if (!ratings[rating.PlaceId]) {
                ratings[rating.PlaceId] = {
                    similarity: [],
                    rating: [],
                    average: [],
                    avgRating: rating.Place.rating,
                };
                places.push(rating.PlaceId);
            }
        }
        var neighborAvg = count != 0 ? avg / count : 3;

        // Add items to corresponding arrays
        for (let j = 0; j < neighborRatings.length; j++) {
            const rating = neighborRatings[j];
            // Push similarity between user and neighbor
            ratings[rating.PlaceId].similarity.push(neighbor.similarity);
            // Push rating of neighbor for this place
            ratings[rating.PlaceId].rating.push(rating.rating);
            // Push average rating of neighbor
            ratings[rating.PlaceId].average.push(neighborAvg);
        }
    }

    if (places.length == 0) {
        user.lastRecommended = new Date();
        await user.save();
        return;
    }

    // Compute predictions
    for (var i = 0; i < places.length; i++) {
        const s = cfPrediction(
            ratings[places[i]].similarity,
            ratings[places[i]].rating,
            ratings[places[i]].average,
            userAvg,
            ratings[places[i]].avgRating
        );
        if (s >= CF_THRESHOLD) {
            similarity.push({
                UserId: userId,
                PlaceId: places[i],
                probability: Math.min(0.99, (s - 1) / (5 - 1)),
                from: 'cf',
            });
        }
    }

    // Remove every recommendation made by this method
    await db.Recommendation.destroy({
        where: {
            UserId: userId,
            from: 'cf',
        },
    });

    // For every place in similarity array
    // If a recommendation does not exist for a place, add it
    // Otherwise, update if cbclick probability is bigger than current one
    for (let i = 0; i < similarity.length; i++) {
        const place = similarity[i];
        const recommendation = await db.Recommendation.findOne({
            where: {
                UserId: userId,
                PlaceId: place.PlaceId,
            },
        });

        if (!recommendation) {
            await db.Recommendation.create(place);
        } else if (recommendation.probability < place.probability) {
            recommendation.probability = (place.probability + recommendation.probability) / 2;
            recommendation.from = 'cf';
            await recommendation.save();
        }
    }

    user.lastRecommended = new Date();
    await user.save();
};

/**
 * Generates recommendations using Content Based filtering, preferences and
 * observed clicks
 * @param  {User} user User for whom recommendations will be generated
 */
exports.generateCBRecommendations = async function (user) {
    var similarity = [];
    const userId = user.id;

    // Get preferences
    const userViews = {};
    (
        await db.UserCategory.findAll({
            attributes: ['CategoryId'],
            where: {
                UserId: user.id,
            },
        })
    ).map((preference) => {
        userViews[preference.CategoryId] = 0.75;
        return preference.CategoryId;
    });

    // Get UserViews
    var dbUserViews = await db.UserView.findAll({
        where: {
            UserId: user.id,
        },
    });
    for (var i = 0; i < dbUserViews.length; i++) {
        const userView = dbUserViews[i];
        if (!userViews[userView.CategoryId]) {
            userViews[userView.CategoryId] = 0;
        }
        if (user.views != 0) {
            userViews[userView.CategoryId] = Math.max(userView.views / user.views, userViews[userView.CategoryId] || 0);
        } else {
            userViews[userView.CategoryId] = userViews[userView.CategoryId] || 0;
        }
    }

    // Normalize values
    var categories = Object.keys(userViews);
    var maxViews = 0;
    var minViews = 1;
    for (let i = 0; i < categories.length; i++) {
        maxViews = Math.max(userViews[categories[i]], maxViews);
        minViews = Math.min(userViews[categories[i]], minViews);
    }
    for (let i = 0; i < categories.length; i++) {
        userViews[categories[i]] = (userViews[categories[i]] - minViews) / (maxViews - minViews);
    }

    // Get Places and Categories
    // For each place, create an array of UserView percentage
    const places = (
        await db.Place.findAll({
            attributes: ['id'],
            include: [
                {
                    model: db.Category,
                    attributes: ['id'],
                },
            ],
        })
    ).map((place) => {
        const percentages = [];
        for (var i = 0; i < place.Categories.length; i++) {
            percentages.push(userViews[place.Categories[i].id]);
        }

        return {
            id: place.id,
            percentages: percentages,
        };
    });

    for (let i = 0; i < places.length; i++) {
        const s = cbPrediction(places[i].percentages);
        if (s > CB_THRESHOLD) {
            similarity.push({
                UserId: userId,
                PlaceId: places[i].id,
                probability: Math.min(0.99, s),
                from: 'cb',
            });
        }
    }

    if (similarity.length == 0) {
        user.lastRecommended = new Date();
        await user.save();
        return;
    }

    // Remove every recommendation made by this method
    await db.Recommendation.destroy({
        where: {
            UserId: userId,
            from: 'cb',
        },
    });

    // For every place in similarity array
    // If a recommendation does not exist for a place, add it
    // Otherwise, update if cbclick probability is bigger than current one
    for (let i = 0; i < similarity.length; i++) {
        const place = similarity[i];
        const recommendation = await db.Recommendation.findOne({
            where: {
                UserId: userId,
                PlaceId: place.PlaceId,
            },
        });

        if (!recommendation) {
            await db.Recommendation.create(place);
        } else if (recommendation.probability < place.probability) {
            recommendation.probability = (place.probability + recommendation.probability) / 2;
            recommendation.from = 'cb';
            await recommendation.save();
        }
    }

    user.lastRecommended = new Date();
    await user.save();
};
