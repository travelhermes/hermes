/* jshint esversion: 8 */
const { Spinner, ENDPOINTS, sha256, post } = require('./utils.js');
const account = require('./account.js');
const auth = require('./auth.js');
const places = require('./places.js');
const planner = require('./planner.js');
const ratings = require('./ratings.js');
const recommender = require('./recommender.js');
const session = require('./session.js');

if (!process.env.SERVER) {
	const spinner = new Spinner('Setup');
	spinner.fail('SERVER not provided');
}
if (!process.env.EMAIL || !process.env.PASSWORD) {
	const spinner = new Spinner('Setup');
	spinner.fail('EMAIL or PASSWORD not provided');
}

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

(async function main() {
	await session.main();

	console.log();
	const spinner = new Spinner('Sign in');
	var res = await _signin();
	spinner.assert(res == 200);

	console.log();
	await account.main();
	console.log();
	await places.main();
	console.log();
	await planner.main();
	console.log();
	await ratings.main();
	console.log();
	await recommender.main();
	console.log();
	await auth.main();
})();
