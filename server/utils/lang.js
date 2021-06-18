/* jshint esversion: 8 */
const langs = ["en", "es"];

exports.acceptedLanguage = function (string) {
	if (string.length != 2) {
		return false;
	}
    return langs.indexOf(string) != -1;
};