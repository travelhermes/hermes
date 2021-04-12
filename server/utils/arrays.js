/* jshint esversion: 8 */
/**
 * Checks if an array of items has duplicates
 * @param  {Array}   array Array to look into
 * @return {Boolean}       true if has duplicates, false otherwise
 */
exports.hasDuplicates = function (array) {
    if (!array || array.length == 0) {
        return false;
    }
    return array.some(function (item, idx) {
        return array.indexOf(item) != idx;
    });
};
