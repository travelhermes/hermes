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
			.pipe(csv())
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

async function main() {
	var spinner = ora('Cleaning database').start();
	await db.Place.destroy({
		where: {
			id: {
				[Op.not]: null,
			},
		},
		force: true,
	});
	await db.Category.destroy({
		where: {
			id: {
				[Op.not]: null,
			},
		},
		force: true,
	});
	await db.User.destroy({
		where: {
			id: {
				[Op.not]: null,
			},
		},
		force: true,
	});
	spinner.succeed();

	spinner = ora('Reading movies.csv').start();
	const movies = await readCsv('./data/movies.csv');
	spinner.succeed();

	spinner = ora('Reading ratings.csv').start();
	const ratings = await readCsv('./data/ratings.csv');
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
	var dbMovies = [];
	var dbMovieGenres = [];
	for (let i = 0; i < movies.length; i++) {
		dbMovies.push({
				id: movies[i].movieId,
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

		if (movies[i].length == 0) {
			let genre = getElementByKey(genres, 'name', '(no genres listed)');
			dbMovieGenres.push({
				PlaceId: movies[i].movieId,
				CategoryId: genre.id,
			});
		} else {
			for (let j = 0; j < movies[i].genres.length; j++) {
				let genre = getElementByKey(genres, 'name', movies[i].genres[j]);
				dbMovieGenres.push({
					PlaceId: movies[i].movieId,
					CategoryId: genre.id,
				});
			}
		}
	}
	await db.Place.bulkCreate(dbMovies);
	await db.PlaceCategory.bulkCreate(dbMovieGenres);
	spinner.succeed();

	// Get all possible userIds
	// Add users to DB
	// userId,movieId,rating,timestamp
	spinner = ora('Getting users').start();
	var dbUsers = [];
	var dbUserViews = [];
	for (let i = 0; i < ratings.length; i++) {
		if (!users.includes(ratings[i].userId)) {
			users.push(ratings[i].userId);
			dbUsers.push({
				id: ratings[i].userId,
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

			for (let j = 0; j < genres.length; j++) {
				dbUserViews.push({
					UserId: ratings[i].userId,
					CategoryId: genres[j].id,
					views: 0,
				});
			}
		}
	}
	await db.User.bulkCreate(dbUsers);
	await db.UserView.bulkCreate(dbUserViews);
	spinner.succeed();

	spinner = ora('Adding ratings').start();
	for (let i = 0; i < ratings.length; i++) {
		// Add ratings
		await db.Rating.create({
			UserId: ratings[i].userId,
			PlaceId: ratings[i].movieId,
			rating: Math.round(ratings[i].rating),
		});

		// Get user
		let user = await db.User.findOne({
			where: {
				id: ratings[i].userId,
			},
		});

		// Update UserView
		let movie = await db.Place.findOne({
			where: {
				id: ratings[i].movieId,
			},
			includes: [
				{
					model: db.Category,
				},
			],
		});

		movie.rating = (movie.rating * movie.count + Math.round(ratings[i].rating)) / (movie.count + 1);
		movie.count = movie.count + 1;
		await movie.save();

		for (let j = 0; j < movie.Categories.length; j++) {
			let userView = await db.UserView.findOne({
				where: {
					UserId: user.id,
					CategoryId: movie.Categories[j].id,
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
	spinner = ora('Generating recommendations').start();
	for (let i = 0; i < 20; i++) {
		db.User.update(
			{
				lastNeighbor: new Date(2021, 1, 1),
				lastRecommended: new Date(2021, 1, 1),
			},
			{
				where: {
					id: {
						[Op.not]: null,
					},
				},
			}
		);
		let dbUsers = await db.User.findAll();
		for (var j = 0; j < dbUsers.length; j++) {
			Recommender.findNeighbors(user);
			Recommender.generateCFRecommendations(user);
			Recommender.generateCBRecommendations(user);
		}
	}
	spinner.succeed();
	console.log(new Date());
}

main();
