/* jshint esversion: 8 */
const validator = require("validator");

exports.sanitize = function (string) {
    if (typeof string != "string") {
        return '';
    }

    string = string.replace(/[]/g)
    return validator.trim(validator.escape(validator.blacklist(string, '`\'"{}<>&\/')));
};
