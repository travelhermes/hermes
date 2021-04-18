/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256, ENDPOINTS } = require('./utils.js');

if (!process.env.SERVER) {
	const spinner = new Spinner('Setup');
	spinner.fail('SERVER not provided');
}
if (!process.env.EMAIL || !process.env.PASSWORD) {
	const spinner = new Spinner('Setup');
	spinner.fail('EMAIL or PASSWORD not provided');
}

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

async function randomPlaces() {
	const spinner = new Spinner('Get random places without ignores');

	const res = await post(ENDPOINTS.placesRandom);

	spinner.assert([res.status == 200, res.data.places.length <= 5]);
}

async function randomPlacesIgnores() {
	const spinner = new Spinner('Get random places with ignores');

	const request = {
		ignores: []
	};

	for (let i = 1; i <= 259 - 4; i++) {
		request.ignores.push(i);
	}

	const res = await post(ENDPOINTS.placesRandom, request);

	var notIgnored = false;
	for (let i = 0; i < res.data.places.length; i++) {
		if(request.ignores.includes(res.data.places[i])) {
			notIgnored = true;
			break;
		}
	}

	spinner.assert([res.status == 200, res.data.places.length <= 4, !notIgnored]);
}

async function searchSpecificPlace() {
	const spinner = new Spinner('Search specific place');

	const res = await get(ENDPOINTS.placesSearch + '/museo del prado');

	spinner.assert([res.status == 200, res.data.result.length == 1]);
}

async function searchMultiplePlaces() {
	const spinner = new Spinner('Search for multiple places');

	const res = await get(ENDPOINTS.placesSearch + '/museo de');

	spinner.assert([res.status == 200, res.data.result.length > 1]);
}

async function searchPlacesNoResults() {
	const spinner = new Spinner('Search for places with no results');

	const res = await post(ENDPOINTS.placesSearch + '/test');

	spinner.assert([res.status == 200, res.data.result.length == 0]);
}

async function main() {
	console.log('Testing Places endpoint');

	await placeInfo();
	await randomPlaces();
	await randomPlacesIgnores();
	await searchSpecificPlace();
	await searchMultiplePlaces();
	await searchPlacesNoResults();
}

/* Run tests */
exports.main = main;
