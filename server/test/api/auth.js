/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256, ENDPOINTS } = require('./utils.js');
const db = require('../../db/models.js');

db.sequelize.options.logging = false;

var key;

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

async function logoutUser() {
	const spinner = new Spinner('Logging out user');
	const res1 = await get(ENDPOINTS.logout);
	const res2 = await get(ENDPOINTS.accountInfo);

	spinner.assert([res1.status == 301, res2.status == 301]);
}
async function logoutAllSessions() {
	const spinner = new Spinner('Logging out all sessions');
	await _signin();

	const res1 = await get(ENDPOINTS.logoutAll);
	const res2 = await get(ENDPOINTS.accountInfo);

	var id = (await get(ENDPOINTS.id)).data.id;

	const sessions = await db.Session.findAll({
		where: {
			UserId: id,
		},
	});
	const logins = await db.Login.findAll({
		where: {
			UserId: id,
		},
	});

	spinner.assert([res1.status == 200, res2.status == 200, sessions.length == 1, logins.length == 0]);
}

async function changePassword() {
	const spinner = new Spinner('Changing password');

	const request = {
		password: sha256(process.env.PASSWORD),
	};

	const res = await put(ENDPOINTS.passwordUpdate, request);

	spinner.assert(res.status == 200);
}

async function changePasswordMissingAttribute() {
	const spinner = new Spinner('Changing password with empty body');
	const res = await put(ENDPOINTS.passwordUpdate);

	spinner.assert(res.status == 400);
}

async function changePasswordNotHash() {
	const spinner = new Spinner('Changing passwords with password that is not hash');
	const request = {
		password: process.env.PASSWORD,
	};

	const res = await put(ENDPOINTS.passwordUpdate, request);

	spinner.assert(res.status == 400);
}

async function requestReset() {
	const spinner = new Spinner('Requesting a password reset');
	const request = {
		email: process.env.EMAIL,
	};

	const res = await post(ENDPOINTS.passwordRequest, request);
	const token = await db.PasswordRequest.findOne({
		include: [
			{
				model: db.User,
				where: {
					email: process.env.EMAIL
				}
			}
		],
		order: [['createdAt', 'DESC']],
	});

	spinner.assert([res.status == 200, token != null]);
}

async function requestResetMissingAttribute() {
	const spinner = new Spinner('Requesting a password reset without providing email');
	const res = await post(ENDPOINTS.passwordRequest);

	spinner.assert(res.status == 400);
}

async function changePasswordReset() {
	const spinner = new Spinner('Changing password with token');

	const token = await db.PasswordRequest.findOne({
		include: [
			{
				model: db.User,
				where: {
					email: process.env.EMAIL
				}
			}
		],
		order: [['createdAt', 'DESC']],
		//paranoid: false,
	});

	const request = {
		token: token.key,
		password: sha256(process.env.PASSWORD),
	};

	key = token.key;

	const res = await put(ENDPOINTS.passwordChange, request);

	spinner.assert(res.status == 200);
}
async function changePasswordResetInvalidToken() {
	const spinner = new Spinner('Changing password with invalid token');

	const token = await db.PasswordRequest.findOne({
		include: [
			{
				model: db.User,
				where: {
					email: process.env.EMAIL
				}
			}
		],
		order: [['createdAt', 'DESC']],
		paranoid: false,
	});

	const request = {
		token: token.key,
		password: sha256(process.env.PASSWORD),
	};

	const res = await put(ENDPOINTS.passwordChange, request);

	spinner.assert(res.status == 403);
}
async function changePasswordResetNotHash() {
	const spinner = new Spinner('Changing password with password that is not hash');
	var id = (await get(ENDPOINTS.id)).data.id;

	const token = await db.PasswordRequest.findOne({
		include: [
			{
				model: db.User,
				where: {
					email: process.env.EMAIL
				}
			}
		],
		order: [['createdAt', 'DESC']],
	});

	const request = {
		token: token.key,
		password: process.env.PASSWORD,
	};

	const res = await put(ENDPOINTS.passwordChange, request);

	spinner.assert(res.status == 400);
}
async function changePasswordResetMissingAttribute() {
	const spinner = new Spinner('Changing password with missing attribute');

	const request = {
		password: process.env.PASSWORD,
	};

	const res = await put(ENDPOINTS.passwordChange, request);

	spinner.assert(res.status == 400);
}

async function main() {
	console.log('Testing Auth endpoint');

	await logoutUser();
	await logoutAllSessions();
	await changePassword();
	await changePasswordMissingAttribute();
	await changePasswordNotHash();
	await requestReset();
	await requestResetMissingAttribute();
	await changePasswordResetNotHash();
	await changePasswordResetMissingAttribute();
	await changePasswordReset();
	await changePasswordResetInvalidToken();

	// Cleanup
	await db.PasswordRequest.destroy({
		where: {
			key: key
		},
		force: true
	});
}

/* Run tests */
exports.main = main;
