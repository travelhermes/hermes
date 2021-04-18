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

async function download() {
	const spinner = new Spinner('Download account data');
	const res = await get(ENDPOINTS.accountDownload);

	spinner.assert([
		res.status == 200,
		res.data.exported != undefined || res.data.exported != null,
		res.data.user != undefined || res.data.user != null,
		res.data.preferences != undefined || res.data.preferences != null,
		res.data.ratings != undefined || res.data.ratings != null,
		res.data.plans != undefined || res.data.plans != null,
	]);
}

async function accountInfo() {
	const spinner = new Spinner('Get account info');
	const res = await get(ENDPOINTS.accountInfo);

	spinner.assert([
		res.status == 200,
		res.data.preferences.length >= 3,
		res.data.user != undefined || res.data.user != null,
		res.data.notifications != undefined || res.data.notifications != null,
	]);
}

async function updateInfoOk() {
	const spinner = new Spinner('Update account info with valid attributes');

	const request = {
		preferences: [35, 18, 12, 4, 28, 7, 13, 44, 25, 38, 48, 41, 14, 36, 43],
		user: {
			email: 'hermes@galisteo.me',
			name: 'Alvaro',
			surname: 'G.',
		},
	};

	const res = await put(ENDPOINTS.accountUpdate, request);

	spinner.assert(res.status == 200);
}

async function updateInfoLessPreferences() {
	const spinner = new Spinner('Update account info with <3 preferences');

	const request = {
		preferences: [35],
		user: {
			email: 'hermes@galisteo.me',
			name: 'Alvaro',
			surname: 'G.',
		},
	};

	const res = await put(ENDPOINTS.accountUpdate, request);

	spinner.assert(res.status == 400);
}

async function updateInfoNotEmail() {
	const spinner = new Spinner('Update account info with invalid email');

	const request = {
		preferences: [35, 18, 12, 4, 28, 7, 13, 44, 25, 38, 48, 41, 14, 36, 43],
		user: {
			email: 'hermes',
			name: 'Alvaro',
			surname: 'G.',
		},
	};

	const res = await put(ENDPOINTS.accountUpdate, request);

	spinner.assert(res.status == 400);
}

async function updateInfoMissingAttributes() {
	const spinner = new Spinner('Update account info with missing attributes');

	const request = {
		preferences: [35, 18, 12, 4, 28, 7, 13, 44, 25, 38, 48, 41, 14, 36, 43],
		user: {
			email: 'hermes@galisteo.me',
			name: 'Alvaro',
		},
	};

	const res = await put(ENDPOINTS.accountUpdate, request);

	spinner.assert(res.status == 400);
}

async function updateNotificationsOk() {
	const spinner = new Spinner('Update account notifications with valid attributes');

	const request = {
		ratings: true,
		plans: false,
	};

	const res1 = await put(ENDPOINTS.notificationsUpdate, request);
	const res2 = await get(ENDPOINTS.accountInfo);

	spinner.assert([
		res1.status == 200, 
		res2.data.notifications.ratings == true && res2.data.notifications.plans == false
	]);
}
async function updateNotificationsMissingAttributes() {
	const spinner = new Spinner('Update account notifications with missing attributes');

	const request = {
		ratings: true,
	};

	const res = await put(ENDPOINTS.notificationsUpdate, request);

	spinner.assert(res.status == 400);
}

async function main() {
	console.log('Testing Account endpoint');

	await download();
	await accountInfo();
	await updateInfoOk();
	await updateInfoLessPreferences();
	await updateInfoNotEmail();
	await updateInfoMissingAttributes();
	await updateNotificationsOk();
	await updateNotificationsMissingAttributes();
}

/* Run tests */
exports.main = main;
