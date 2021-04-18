/* jshint esversion: 8 */
const { Spinner, get, post, put, sha256, ENDPOINTS } = require('./utils.js');
const db = require('../db/models.js');
const { toDecimal } = require('geolib');

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

var planId;

async function getPlanLength() {
	const spinner = new Spinner('Get the recommended length of a plan');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerLength, request);

	spinner.assert([res.status == 200, res.data.days == 4]);
}

async function getPlanLengthUnknownPlace() {
	const spinner = new Spinner('Get the recommended length of a plan with unknown place');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		places: [
			400,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerLength, request);

	spinner.assert([res.status == 400]);
}

async function getPlanLengthFewPlaces() {
	const spinner = new Spinner('Get the recommended length of a plan with < 3 places');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		places: [2, 21],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerLength, request);

	spinner.assert([res.status == 400]);
}

async function getPlanLengthInvalidHours() {
	const spinner = new Spinner('Get the recommended length of a plan with invalid hours');

	const request = {
		dayEnd: 540,
		dayStart: 1080,
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerLength, request);

	spinner.assert([res.status == 400]);
}

async function getPlanLengthMissingStart() {
	const spinner = new Spinner('Get the recommended length of a plan without starting point');

	const request = {
		dayEnd: 540,
		dayStart: 1080,
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
	};

	const res = await post(ENDPOINTS.plannerLength, request);

	spinner.assert([res.status == 400]);
}

async function createPlan() {
	const spinner = new Spinner('Create a new plan');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		description: 'Ruta por lugares importantes de Madrid',
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(2),
		name: 'Visita por Madrid',
		places: [19, 16, 144, 43],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 200, res.data.id != null]);
}

async function createPlanFewPlaces() {
	const spinner = new Spinner('Create a new plan with < 3 places');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		description: 'Ruta por lugares importantes de Madrid',
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(5),
		name: 'Visita por Madrid',
		places: [2, 21],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function createPlanUnknownPlace() {
	const spinner = new Spinner('Create a new plan with an unknown place');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		description: 'Ruta por lugares importantes de Madrid',
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(5),
		name: 'Visita por Madrid',
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			400,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function createPlanMissingAttributes() {
	const spinner = new Spinner('Create a new plan with missing attributes');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(5),
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function createPlanInvalidDates() {
	const spinner = new Spinner('Create a new plan with invalid dates');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		description: 'Ruta por lugares importantes de Madrid',
		endDate: new Date().addDays(1),
		startDate: new Date().addDays(5),
		name: 'Visita por Madrid',
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function createPlanInvalidHours() {
	const spinner = new Spinner('Create a new plan with invalid hours');

	const request = {
		dayEnd: 540,
		dayStart: 1080,
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(5),
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
		start: {
			lat: 40.41669813586243,
			lon: -3.703207969665528,
		},
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function createPlanMissingStart() {
	const spinner = new Spinner('Create a new plan with missing starting point');

	const request = {
		dayEnd: 1080,
		dayStart: 540,
		startDate: new Date().addDays(1),
		endDate: new Date().addDays(5),
		places: [
			2,
			21,
			34,
			43,
			49,
			59,
			62,
			70,
			121,
			122,
			123,
			133,
			139,
			140,
			143,
			156,
			162,
			163,
			164,
			165,
			175,
			180,
			246,
			253,
		],
	};

	const res = await post(ENDPOINTS.plannerCreate, request);

	spinner.assert([res.status == 400]);
}

async function getPlans() {
	const spinner = new Spinner("Getting all user's plans");
	const res = await get(ENDPOINTS.plannerList);
	spinner.assert([
		res.status == 200,
		res.data.past != undefined,
		res.data.active != undefined,
		res.data.active.length == 1,
	]);
}

async function getPlanStatus() {
	const spinner = new Spinner('Getting the status of a plan');
	const res1 = await get(ENDPOINTS.plannerList);
	const res2 = await get(ENDPOINTS.plannerStatus + '/' + res1.data.active[0].id);

	spinner.assert([res2.status == 200, res2.data.status == 0]);
}

async function getUnknownPlanStatus() {
	const spinner = new Spinner('Getting the status of an unknown plan');
	const res2 = await get(ENDPOINTS.plannerStatus + '/400');

	spinner.assert([res2.status == 403]);
}

async function getPlan() {
	const spinner = new Spinner('Getting plan info');
	const res1 = await get(ENDPOINTS.plannerList);
	const res2 = await post(ENDPOINTS.plannerGet, { id: res1.data.active[0].id });
	spinner.assert([
		res2.status == 200,
		res2.data.items != undefined,
		res2.data.plan != undefined,
		res2.data.items.length > 0,
		res2.data.plan.dayEnd != undefined,
		res2.data.plan.dayStart != undefined,
		res2.data.plan.description != undefined,
		res2.data.plan.endDate != undefined,
		res2.data.plan.id == res1.data.active[0].id,
		res2.data.plan.name != undefined,
		res2.data.plan.startDate != undefined,
		res2.data.plan.startLat != undefined,
		res2.data.plan.startLon != undefined,
		res2.data.plan.status == 0,
	]);
}

async function getUnknownPlan() {
	const spinner = new Spinner('Getting unknown plan');
	const res = await post(ENDPOINTS.plannerGet, { id: 400 });
	spinner.assert([res.status == 403]);
}

async function updatePlan() {
	const spinner = new Spinner('Updating a plan');
	const res1 = await get(ENDPOINTS.plannerList);

	var today = new Date();
	today.setHours(2,0,0,0);

	const request = {
		items: [
			{
				PlaceId: null,
				day: 0,
				description: null,
				order: 0,
				timeSpent: 15,
				type: 2,
			},
			{
				PlaceId: 19,
				day: 0,
				description: null,
				order: 1,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 16,
				day: 0,
				description: null,
				order: 2,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 144,
				day: 0,
				description: null,
				order: 3,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 43,
				day: 0,
				description: '',
				order: 4,
				timeSpent: 15,
				type: 1,
			},
			{
				day: 1,
				description: '',
				order: 0,
				timeSpent: 15,
				type: 2,
			},
		],
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: res1.data.active[0].id,
			name: 'Madrid',
			startDate: today,
		},
	};

	const res2 = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res2.status == 200]);
}

async function updatePlanStartNotFirst() {
	const spinner = new Spinner('Updating a plan where a starting point is not first');
	const res1 = await get(ENDPOINTS.plannerList);

	const request = {
		items: [
			{
				PlaceId: 19,
				day: 0,
				description: null,
				order: 0,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: null,
				day: 0,
				description: null,
				order: 1,
				timeSpent: 0,
				type: 2,
			},
			{
				PlaceId: 16,
				day: 0,
				description: null,
				order: 2,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 144,
				day: 0,
				description: null,
				order: 3,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 43,
				day: 0,
				description: '',
				order: 4,
				timeSpent: 0,
				type: 1,
			},
			{
				day: 1,
				description: '',
				order: 0,
				timeSpent: 0,
				type: 2,
			},
		],
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: res1.data.active[0].id,
			name: 'Madrid',
			startDate: (new Date()).addDays(2),
		},
	};

	const res2 = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res2.status == 400]);
}

async function updatePlanUnknownPlace() {
	const spinner = new Spinner('Updating a plan with unknown place');
	const res1 = await get(ENDPOINTS.plannerList);

	const request = {
		items: [
			{
				PlaceId: 400,
				day: 0,
				description: null,
				order: 0,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: null,
				day: 0,
				description: null,
				order: 1,
				timeSpent: 0,
				type: 2,
			},
			{
				PlaceId: 16,
				day: 0,
				description: null,
				order: 2,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 144,
				day: 0,
				description: null,
				order: 3,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 43,
				day: 0,
				description: '',
				order: 4,
				timeSpent: 0,
				type: 1,
			},
			{
				day: 1,
				description: '',
				order: 0,
				timeSpent: 0,
				type: 2,
			},
		],
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: res1.data.active[0].id,
			name: 'Madrid',
			startDate: (new Date()).addDays(2),
		},
	};

	const res2 = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res2.status == 400]);
}

async function updatePlanMissingAttributes() {
	const spinner = new Spinner('Updating a plan with missing attributes');
	const res1 = await get(ENDPOINTS.plannerList);

	const request = {
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: res1.data.active[0].id,
			name: 'Madrid',
			startDate: '2021-04-28T00:00:00.000Z',
		},
	};

	const res2 = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res2.status == 400]);
}

async function updateUnknownPlan() {
	const spinner = new Spinner('Updating an unknown');

	const request = {
		items: [
			{
				PlaceId: 19,
				day: 0,
				description: null,
				order: 0,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: null,
				day: 0,
				description: null,
				order: 1,
				timeSpent: 0,
				type: 2,
			},
			{
				PlaceId: 16,
				day: 0,
				description: null,
				order: 2,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 144,
				day: 0,
				description: null,
				order: 3,
				timeSpent: 0,
				type: 1,
			},
			{
				PlaceId: 43,
				day: 0,
				description: '',
				order: 4,
				timeSpent: 0,
				type: 1,
			},
			{
				day: 1,
				description: '',
				order: 0,
				timeSpent: 0,
				type: 2,
			},
		],
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: 400,
			name: 'Madrid',
			startDate: (new Date()).addDays(2),
		},
	};

	const res = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res.status == 400]);
}

async function updatePlanBadDate() {
	const spinner = new Spinner('Updating a plan where starting date date would be before today');
	const res1 = await get(ENDPOINTS.plannerList);

	const request = {
		items: [
			{
				PlaceId: null,
				day: 0,
				description: null,
				order: 0,
				timeSpent: 15,
				type: 2,
			},
			{
				PlaceId: 19,
				day: 0,
				description: null,
				order: 1,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 16,
				day: 0,
				description: null,
				order: 2,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 144,
				day: 0,
				description: null,
				order: 3,
				timeSpent: 15,
				type: 1,
			},
			{
				PlaceId: 43,
				day: 0,
				description: '',
				order: 4,
				timeSpent: 15,
				type: 1,
			},
			{
				day: 1,
				description: '',
				order: 0,
				timeSpent: 15,
				type: 2,
			},
		],
		plan: {
			description: 'Visita por lugares más conocidos de Madrid',
			id: res1.data.active[0].id,
			name: 'Madrid',
			startDate: (new Date()).addDays(-1),
		},
	};

	const res2 = await put(ENDPOINTS.plannerUpdate, request);

	spinner.assert([res2.status == 400]);
}

async function deletePlan() {
	const spinner = new Spinner('Deleting a plan');
	const res1 = await get(ENDPOINTS.plannerList);
	const res2 = await post(ENDPOINTS.plannerDelete, { id: res1.data.active[0].id });
	planId = res1.data.active[0].id;
	spinner.assert(res2.status == 200);
}

async function deleteUnknownPlan() {
	const spinner = new Spinner('Deleting a plan');
	const res = await post(ENDPOINTS.plannerDelete, { id: planId });
	spinner.assert(res.status == 403);
}

async function main() {
	console.log('Testing Planner endpoint');

	var id = (await get(ENDPOINTS.id)).data.id;

	await db.Plan.destroy({
		where: {
			UserId: id,
		},
		force: true,
	});

	await getPlanLength();
	await getPlanLengthUnknownPlace();
	await getPlanLengthFewPlaces();
	await getPlanLengthInvalidHours();
	await getPlanLengthMissingStart();
	await createPlan();
	await createPlanFewPlaces();
	await createPlanUnknownPlace();
	await createPlanMissingAttributes();
	await createPlanInvalidDates();
	await createPlanInvalidHours();
	await createPlanMissingStart();
	await getPlans();
	await getPlanStatus();
	await getUnknownPlanStatus();
	await getPlan();
	await getUnknownPlan();
	await updatePlan();
	await updatePlanStartNotFirst();
	await updatePlanUnknownPlace();
	await updatePlanMissingAttributes();
	await updateUnknownPlan();
	await updatePlanBadDate();
	await deletePlan();
	await deleteUnknownPlan();
}

/* Run tests */
exports.main = main;
