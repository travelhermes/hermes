/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256, ENDPOINTS } = require('./utils.js');
const db = require('../../db/models.js');

db.sequelize.options.logging = false;

if (!process.env.SERVER) {
	const spinner = new Spinner('Setup');
	spinner.fail('SERVER not provided');
}
if (!process.env.EMAIL || !process.env.PASSWORD) {
	const spinner = new Spinner('Setup');
	spinner.fail('EMAIL or PASSWORD not provided');
}

async function createRating() {
	const spinner = new Spinner('Create rating');

	const res = await post(ENDPOINTS.ratingCreate, {
		rating: 4,
		placeId: 43,
	});

	spinner.assert([res.status == 200]);
}

async function createRatingConflict() {
	const spinner = new Spinner('Create rating that already exists');

	const res = await post(ENDPOINTS.ratingCreate, {
		rating: 4,
		placeId: 43,
	});

	spinner.assert([res.status == 400]);
}

async function createRatingOutBounds() {
	const spinner = new Spinner('Create rating out of bounds');

	const res1 = await post(ENDPOINTS.ratingCreate, {
		rating: 0,
		placeId: 42,
	});
	const res2 = await post(ENDPOINTS.ratingCreate, {
		rating: 6,
		placeId: 44,
	});

	spinner.assert([res1.status == 400, res2.status == 400]);
}

async function createRatingDoesNotExist() {
	const spinner = new Spinner('Create rating for a place that does not exist');

	const res = await post(ENDPOINTS.ratingCreate, {
		rating: 4,
		placeId: -1,
	});

	spinner.assert([res.status == 404]);
}

async function createRatingMissingAttributes() {
	const spinner = new Spinner('Create rating with missing attributes');

	const res = await post(ENDPOINTS.ratingCreate, {
		placeId: 43,
	});

	spinner.assert([res.status == 400]);
}

async function deleteRating() {
	const spinner = new Spinner('Delete a rating');

	await post(ENDPOINTS.ratingCreate, {
		rating: 4,
		placeId: 1,
	});

	const res = await post(ENDPOINTS.ratingDelete, {
		placeId: 1,
	});

	spinner.assert([res.status == 200]);
}

async function deleteRatingDoesNotExist() {
	const spinner = new Spinner('Delete a rating that does not exist');

	const res = await post(ENDPOINTS.ratingDelete, {
		placeId: 1,
	});

	spinner.assert([res.status == 404]);
}

async function deleteRatingPlaceDoesNotExist() {
	const spinner = new Spinner('Delete a rating that does not exist');

	const res = await post(ENDPOINTS.ratingDelete, {
		placeId: 400,
	});

	spinner.assert([res.status == 404]);
}

async function deleteRatingMissingAttributes() {
	const spinner = new Spinner('Delete a rating with empty body');

	const res = await post(ENDPOINTS.ratingDelete);

	spinner.assert([res.status == 400]);
}

async function getRatings() {
	const spinner = new Spinner('Get user ratings');

	const res = await get(ENDPOINTS.ratingsGet);

	spinner.assert([
		res.status == 200,
		res.data.pending != undefined,
		res.data.done != undefined,
		res.data.done.length == 1,
		res.data.done[0].id == 43,
	]);
}

async function searchRatings() {
	const spinner = new Spinner('Search for places not rated by the user');

	const res = await get(ENDPOINTS.ratingsSearch + '/museo de');

	for (var i = 0; i < res.data.result.length; i++) {
		if (res.data.result[i].id == 43) {
			spinner.fail();
			return;
		}
	}

	spinner.assert([res.status == 200]);
}

async function main() {
	console.log('Testing Ratings endpoint');

	var id = (await get(ENDPOINTS.id)).data.id;

	await db.Rating.destroy({
		where: {
			UserId: id,
		},
	});

	await createRating();
	await createRatingConflict();
	await createRatingOutBounds();
	await createRatingDoesNotExist();
	await createRatingMissingAttributes();
	await deleteRating();
	await deleteRatingDoesNotExist();
	await deleteRatingPlaceDoesNotExist();
	await deleteRatingMissingAttributes();
	await getRatings();
	await searchRatings();
}

/* Run tests */
exports.main = main;
