/* jshint esversion: 8 */
const { Localization } = require('../localization/index.js');
const loc = new Localization();

module.exports = function (request, reply, done) {
	if (request.url.startsWith('/api')) {
		done();
	} else {
		loc.getFile(request, reply, 'es');
		return;
	}
};
