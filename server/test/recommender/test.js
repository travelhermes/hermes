/* jshint esversion: 8 */
const db = require('../../db/models.js');
const fs = require('fs');
const ora = require('ora');
const { Op } = require('sequelize');
const csv = require('csv-parser');
const Recommender = require('../../recommender/index.js');

db.sequelize.options.logging = false;

function readCsv(path) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(path)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            });
    });
}

/**
 * Get element from array
 * @param  {Array<object>}  array Array to get element from
 * @param  {string}         key   Key to match
 * @param  {any}            value Value to match in key
 * @return                        element or null
 */
function getElementByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] == value) {
            return array[i];
        }
    }

    return null;
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function metrics(users) {
    return new Promise(async (resolve) => {
        var mse_sum = 0;
        var mae_sum = 0;
        var count = 0;
        for (var i = 0; i < users.length; i++) {
            const user = users[i];
            const ratings = await db.Rating.findAll({
                where: {
                    UserId: user.id,
                },
            });
            const recommendations = await db.Recommendation.findAll({
                where: {
                    UserId: user.id,
                    PlaceId: {
                        [Op.in]: ratings.map((rating) => {
                            return rating.PlaceId;
                        }),
                    },
                },
            });

            for (var j = 0; j < recommendations.length; j++) {
                const predicted = 1 + (5 - 1) * recommendations[j].probability;
                const observed = getElementByKey(ratings, 'PlaceId', recommendations[j].PlaceId).rating;

                mse_sum += Math.pow(observed - predicted, 2);
                mae_sum += Math.abs(predicted - observed);
                count++;
            }
        }
        // [MSE, MAE]
        resolve([(1 / count) * mse_sum, (1 / count) * mae_sum]);
    });
}

async function main() {
    var spinner = ora('Cleaning database').start();
    await db.sequelize.sync({ force: true });
    spinner.succeed();

    spinner = ora('Reading movies').start();
    var movies = await readCsv('./data/movies.dat');
    spinner.succeed();

    spinner = ora('Reading ratings').start();
    const ratings = await readCsv('./data/ratings.dat');
    spinner.succeed();

    const genres = [];
    const users = [];

    // Get all possible genres
    // Add genres to DB
    spinner = ora('Getting genres').start();
    for (let i = 0; i < movies.length; i++) {
        movies[i].genres = movies[i].genres.split('|');
        for (let j = 0; j < movies[i].genres.length; j++) {
            if (!genres.includes(movies[i].genres[j])) {
                genres.push(movies[i].genres[j]);
            }
        }
    }
    genres.push('(no genres listed)');
    for (let i = 0; i < genres.length; i++) {
        genres[i] = await db.Category.create({
            id: i + 1,
            name: genres[i],
            fsqId: genres[i],
        });
    }
    spinner.succeed();

    // Adding movies to db
    spinner = ora('Adding movies').start();
    for (let i = 0; i < movies.length; i++) {
        var movie = await db.Place.create({
            id: parseInt(movies[i].movieId),
            fsqId: movies[i].movieId,
            gmapsUrl: '',
            osmId: '',
            name: movies[i].title,
            description: '',
            timeSpent: 0,
            lat: 0,
            lon: 0,
            address: '',
            postalCode: '',
            city: '',
            state: '',
            country: '',
            placeUrl: '',
            phone: '',
            twitter: '',
            facebook: '',
            instagram: '',
            wikidata: '',
            wikipedia: '',
            wheelchair: 0,
            images: 0,
        });

        var categories = [];
        if (movies[i].length == 0) {
            let genre = getElementByKey(genres, 'name', '(no genres listed)');
            categories.push(
                await db.PlaceCategory.create({
                    PlaceId: movies[i].movieId,
                    CategoryId: genre.id,
                })
            );
        } else {
            for (let j = 0; j < movies[i].genres.length; j++) {
                let genre = getElementByKey(genres, 'name', movies[i].genres[j]);
                categories.push(
                    await db.PlaceCategory.create({
                        PlaceId: movies[i].movieId,
                        CategoryId: genre.id,
                    })
                );
            }
        }

        movies[i] = movie;
        movie.Categories = categories;
    }
    spinner.succeed();

    // Get all possible userIds
    // Add users to DB
    // userId,movieId,rating,timestamp
    spinner = ora('Adding users').start();
    for (let i = 0; i < ratings.length; i++) {
        if (!users.includes(ratings[i].userId)) {
            users.push(ratings[i].userId);
            await db.User.create({
                id: parseInt(ratings[i].userId),
                name: 'User ' + ratings[i].userId,
                surname: '',
                country: '',
                email: 'user' + ratings[i].userId + '@test',
                password: '',
                attempts: 0,
                lastAttempt: new Date(2021, 1, 1),
                lastNeighbor: new Date(2021, 1, 1),
                lastRecommended: new Date(2021, 1, 1),
                views: 0,
                notificationsPlans: false,
                notificationsRatings: false,
            });

            var dbUserViews = [];
            for (let j = 0; j < genres.length; j++) {
                dbUserViews.push({
                    UserId: parseInt(ratings[i].userId),
                    CategoryId: genres[j].id,
                    views: 0,
                });
            }
            await db.UserView.bulkCreate(dbUserViews);
        }
    }
    spinner.succeed();

    spinner = ora('Adding ratings').start();
    await sleep(2000);
    for (let i = 0; i < ratings.length; i++) {
        // Get movie
        let movie = getElementByKey(movies, 'id', parseInt(ratings[i].movieId));

        // Add ratings
        await db.Rating.create({
            UserId: parseInt(ratings[i].userId),
            PlaceId: parseInt(ratings[i].movieId),
            rating: parseInt(ratings[i].rating),
        });

        // Get user
        let user = await db.User.findOne({
            where: {
                id: parseInt(ratings[i].userId),
            },
        });

        movie.rating = (movie.rating * movie.count + Math.round(ratings[i].rating)) / (movie.count + 1);
        movie.count = movie.count + 1;
        await movie.save();

        // Update UserView
        for (let j = 0; j < movie.Categories.length; j++) {
            let userView = await db.UserView.findOne({
                where: {
                    UserId: user.id,
                    CategoryId: movie.Categories[j].CategoryId,
                },
            });
            userView.views = userView.views + 1;
            await userView.save();
        }
        user.views = user.views + movie.Categories.length;
        await user.save();
    }
    spinner.succeed();

    console.log(new Date());
    console.log('Generating recommendations');

    var n = [5, 10, 15, 20];
    var r = [2, 4, 6, 8, 10];
    var d = [5, 10, 20];

    // For every N
    console.log('N;R;D;MSE;MAE');
    for (var i = 0; i < n.length; i++) {
        // For every R
        for (var j = 0; j < r.length; j++) {
            // Empty recommendations
            await db.Recommendation.destroy({
                where: {
                    UserId: { [Op.not]: null },
                },
            });
            await db.Neighbor.destroy({
                where: {
                    UserId1: { [Op.not]: null },
                },
            });

            // Generate recommendations for d[i] days
            for (var k = 0; k < d.length; k++) {
                //console.log(`Recommending with N = ${n[i]}, R = ${r[j]}, for ${d[k]} days`);
                let dbUsers = await db.User.findAll();
                for (var l = 0; l < dbUsers.length; l++) {
                    await Recommender.findNeighbors(dbUsers[l], n[i], r[j]);
                    await Recommender.generateCFRecommendations(dbUsers[l]);
                    await Recommender.generateCBRecommendations(dbUsers[l]);
                }

                // Compute metrics
                var m = await metrics(dbUsers);
                console.log(m);
                console.log(`${n[i]};${r[j]};${d[k]};${m[0]};${m[1]}`);
            }
        }
    }
    console.log(new Date());
}

main();
