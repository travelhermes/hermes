/* jshint esversion: 8 */
const validator = require("validator");

exports.sanitize = function (string) {
    if (typeof string != "string") {
        return '';
    }

    return validator.trim(validator.escape(string));
};
