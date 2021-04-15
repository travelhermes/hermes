/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256 } = require('./utils.js');

if (!process.env.SERVER) {
	const spinner = new Spinner('Setup');
	spinner.fail('SERVER not provided');
}
if (!process.env.EMAIL || !process.env.PASSWORD) {
	const spinner = new Spinner('Setup');
	spinner.fail('EMAIL or PASSWORD not provided');
}

const ENDPOINTS = {
	signin: process.env.SERVER + '/api/auth/signin',
	signup: process.env.SERVER + '/api/auth/signup',
	check: process.env.SERVER + '/api/auth/check',
	logoutAll: process.env.SERVER + '/api/auth/logoutSessions',

	accountInfo: process.env.SERVER + '/api/account/info',
	accountUpdate: process.env.SERVER + '/api/account/update/account',
	notificationsUpdate: process.env.SERVER + '/api/account/update/notifications',
	accountDelete: process.env.SERVER + '/api/auth/delete',
	accountDownload: process.env.SERVER + '/api/account/download',

	passwordUpdate: process.env.SERVER + '/api/auth/password/update',
	passwordRequest: process.env.SERVER + '/api/auth/password/request',
	passwordChange: process.env.SERVER + '/api/auth/password/change',

	placesRandom: process.env.SERVER + '/api/places/random',
	placesSearch: process.env.SERVER + '/api/places/search',
	placeInfo: process.env.SERVER + '/api/places/info',

	ratingsGet: process.env.SERVER + '/api/ratings/get',
	ratingCreate: process.env.SERVER + '/api/ratings/create',
	ratingDelete: process.env.SERVER + '/api/ratings/delete',
	ratingUpdate: process.env.SERVER + '/api/ratings/update',
	ratingsSearch: process.env.SERVER + '/api/ratings/search',

	recommendationsGet: process.env.SERVER + '/api/recommendations/get',
	recommendationsRequest: process.env.SERVER + '/api/recommendations/request',

	plannerLength: process.env.SERVER + '/api/plans/length',
	plannerCreate: process.env.SERVER + '/api/plans/create',
	plannerGet: process.env.SERVER + '/api/plans/get',
	plannerList: process.env.SERVER + '/api/plans/list',
	plannerStatus: process.env.SERVER + '/api/plans/status',
	plannerDelete: process.env.SERVER + '/api/plans/delete',
	plannerUpdate: process.env.SERVER + '/api/plans/update',
};

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

async function signin() {
	const spinner = new Spinner('Sign in');
	const res = await _signin();

	if (res == 200) {
		spinner.succeed();
	} else {
		spinner.fail(res);
	}
}

/* Run tests */
signin();
