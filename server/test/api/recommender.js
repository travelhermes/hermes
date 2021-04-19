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

Date.prototype.addDays = function (days) {
	var date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
};

async function placeInfo() {
	const spinner = new Spinner('Get place info');

	const res = await get(ENDPOINTS.placeInfo + '/1');

	spinner.assert([
		res.status == 200,
		res.data.place.address != undefined,
		res.data.place.categories.length > 0,
		res.data.place.city != undefined,
		res.data.place.country != undefined,
		res.data.place.description != undefined,
		res.data.place.fsqId != undefined,
		res.data.place.gmapsUrl != undefined,
		res.data.place.id == 1,
		res.data.place.images != undefined,
		res.data.place.lat != undefined,
		res.data.place.lon != undefined,
		res.data.place.name != undefined,
		res.data.place.osmId != undefined,
		res.data.place.postalCode != undefined,
		res.data.place.rating != undefined,
		res.data.place.state != undefined,
		res.data.place.timeSpent != undefined,
		res.data.place.wheelchair != undefined,
	]);
}

async function requestNewRecommendations() {
	const spinner = new Spinner('Request new recommendations');
	var id = (await get(ENDPOINTS.id)).data.id;

	await db.Recommendation.destroy({
		where: {
			UserId: id,
		},
	});

	const user = await db.User.findOne({
		where: {
			id: id,
		},
	});
	user.lastRecommended = new Date().addDays(-2);
	user.lastNeighbor = new Date().addDays(-2);
	await user.save();

	const res = await get(ENDPOINTS.recommendationsRequest);

	spinner.assert(res.status == 200);
}

async function userRecommendations() {
	const spinner = new Spinner('Get user recommendations');

	const res = await get(ENDPOINTS.recommendationsGet);

	spinner.assert([res.status == 200, res.data.random.length > 0, res.data.places.length > 0]);
}

async function main() {
	console.log('Testing Recommender endpoint');

	await requestNewRecommendations();
	await userRecommendations();
}

/* Run tests */
exports.main = main;
