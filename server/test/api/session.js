/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256, ENDPOINTS } = require('./utils.js');

/* Signin */
async function _signin() {
	return new Promise(async (resolve) => {
		const username = process.env.EMAIL;
		const password = sha256(process.env.PASSWORD);
		const request = {
			email: username,
			password: password,
		};

		const res = await post(ENDPOINTS.signin, request);

		resolve(res.status);
	});
}

async function main() {
	console.log('Testing Session');
	var res;
	// Account
	spinner = new Spinner('GET accountInfo');
	res = await get(ENDPOINTS.accountInfo);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET accountUpdate');
	res = await get(ENDPOINTS.accountUpdate);
	spinner.assert(res.status == 301);

	spinner = new Spinner('PUT otificationsUpdate');
	res = await put(ENDPOINTS.notificationsUpdate);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET accountDownload');
	res = await get(ENDPOINTS.accountDownload);
	spinner.assert(res.status == 301);

	// Auth
	spinner = new Spinner('GET logout');
	res = await get(ENDPOINTS.logout);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET logoutAll');
	res = await get(ENDPOINTS.logoutAll);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST accountDelete');
	res = await post(ENDPOINTS.accountDelete);
	spinner.assert(res.status == 301);

	spinner = new Spinner('PUT passwordUpdate');
	res = await put(ENDPOINTS.passwordUpdate);
	spinner.assert(res.status == 301);

	// Places
	spinner = new Spinner('GET placesSearch');
	res = await get(ENDPOINTS.placesSearch);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST placesSearch');
	res = await post(ENDPOINTS.placesSearch);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET placeInfo');
	res = await get(ENDPOINTS.placeInfo + '/1');
	spinner.assert(res.status == 301);

	// Ratings
	spinner = new Spinner('GET ratingsGet');
	res = await get(ENDPOINTS.ratingsGet);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST ratingCreate');
	res = await post(ENDPOINTS.ratingCreate);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST ratingDelete');
	res = await post(ENDPOINTS.ratingDelete);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET ratingsSearch');
	res = await get(ENDPOINTS.ratingsSearch);
	spinner.assert(res.status == 301);

	// Recommender
	spinner = new Spinner('GET recommendationsGet');
	res = await get(ENDPOINTS.recommendationsGet);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET recommendationsRequest');
	res = await get(ENDPOINTS.recommendationsRequest);
	spinner.assert(res.status == 301);

	// Planner
	spinner = new Spinner('POST plannerLength');
	res = await post(ENDPOINTS.plannerLength);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST plannerCreate');
	res = await post(ENDPOINTS.plannerCreate);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET plannerGet');
	res = await get(ENDPOINTS.plannerGet);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET plannerList');
	res = await get(ENDPOINTS.plannerList);
	spinner.assert(res.status == 301);

	spinner = new Spinner('GET plannerStatus');
	res = await get(ENDPOINTS.plannerStatus);
	spinner.assert(res.status == 301);

	spinner = new Spinner('POST plannerDelete');
	res = await post(ENDPOINTS.plannerDelete);
	spinner.assert(res.status == 301);

	spinner = new Spinner('PUT plannerUpdate');
	res = await put(ENDPOINTS.plannerUpdate);
	spinner.assert(res.status == 301);
}

exports.main = main;
