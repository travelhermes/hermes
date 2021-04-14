/*jshint esversion: 8 */
/* Map tiles server endpoint */
const TILESERVER_ENDPOINT = '<your TILESERVER_ENDPOINT here>';
/* API endpoints
 * https://alvaro.galisteo.me/hermes/api/ */
const ENDPOINTS = {
    signin: '/api/auth/signin',
    signup: '/api/auth/signup',
    check: '/api/auth/check',
    logoutAll: '/api/auth/logoutSessions',

    accountInfo: '/api/account/info',
    accountUpdate: '/api/account/update',
    accountDelete: '/api/auth/delete',
    accountDownload: '/api/account/download',

    passwordUpdate: '/api/auth/password/update',
    passwordRequest: '/api/auth/password/request',
    passwordChange: '/api/auth/password/change',

    placesRandom: '/api/places/random',
    placesSearch: '/api/places/search',
    placeInfo: '/api/places/info',

    ratingsGet: '/api/ratings/get',
    ratingCreate: '/api/ratings/create',
    ratingDelete: '/api/ratings/delete',
    ratingUpdate: '/api/ratings/update',
    ratingsSearch: '/api/ratings/search',

    recommendationsGet: '/api/recommendations/get',
    recommendationsRequest: '/api/recommendations/request',

    plannerLength: '/api/plans/length',
    plannerCreate: '/api/plans/create',
    plannerGet: '/api/plans/get',
    plannerList: '/api/plans/list',
    plannerStatus: '/api/plans/status',
    plannerDelete: '/api/plans/delete',
    plannerUpdate: '/api/plans/update',
};

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

/**
 * Display an error message to the user, while logging it to console.
 * @param  {string} err Error message
 */
function throwError(err) {
    message =
        'Se ha producido un error inesperado mientras se procesaba la solicitud. Consulte la consola de su navegador para más información.\nSi el error persiste, contacte con nosotros.';

    if (err.logId) {
        message += 'Al contactar, por favor, indique en el cuerpo del mensaje el siguiente identificador: ' + err.logId;
    }
    console.log(err);
    alert(message);
}

/**
 * Get an HTML template from its ID.
 * @param  {string}      id Template ID.
 * @return {HTMLElement}    Element based on template.
 */
function getTemplate(id) {
    var template = document.querySelector('template#' + id);
    return template.content.cloneNode(true);
}

/**
 * Fetch an element by its key from an array.
 * @param  {Array}      array Array to search in.
 * @param  {string}     key   Key value.
 * @param  {any}        value Value to match.
 * @return {any | null}       Returns the element from the array if exists.
 */
function getElementByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] == value) {
            return array[i];
        }
    }

    return null;
}

/**
 * Make a HTTP request
 * @param  {string} url
 * @param  {string} method
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function http(url, method, body) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method || 'GET', url);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (xhr.response.length > 0) {
                    try {
                        resolve(JSON.parse(xhr.response));
                    } catch(err) {
                        console.log(err);
                        window.location = '/signin/';
                    }
                } else {
                    resolve({});
                }
            } else if (xhr.status == 301){
                window.location = '/signin/' + btoa(window.location.pathname);
            } else {
                reject({
                    status: xhr.status,
                    msg: xhr.statusText,
                });
            }
        };

        xhr.onerror = function () {
            reject({
                status: -1,
                msg: 'Unknown',
            });
        };

        xhr.send(JSON.stringify(body));
    });
}

/**
 * Make a GET HTTP request
 * @param  {string} url
 * @return {Promise}       Resolves with object from server
 */
function get(url) {
    return http(url, 'GET', {});
}

/**
 * Make a POST HTTP request
 * @param  {string} url
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function post(url, body) {
    return http(url, 'POST', body);
}

/**
 * Make a PUT HTTP request
 * @param  {string} url
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function put(url, body) {
    return http(url, 'PUT', body);
}

function plural(value, singular) {
    if (value == 1) {
        return value + ' ' + singular;
    } else {
        return value + ' ' + singular + 's';
    }
}

/**
 * Computes the SHA256 hash from a string
 * @param  {string} ascii String to get the hash from
 * @return {string}       SHA256 hash
 */
function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j; // Used as a counter across the whole file
    var result = '';

    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;

    //* caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash = (sha256.h = sha256.h || []);
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k = (sha256.k = sha256.k || []);
    var primeCounter = k[lengthProperty];
    /*/
    var hash = [], k = [];
    var primeCounter = 0;
    //*/

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80'; // Append Ƈ' bit (plus zero padding)
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00'; // More zero padding
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return; // ASCII check: only accept characters in range 0-255
        words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;

    // process each chunk
    for (j = 0; j < words[lengthProperty]; ) {
        var w = words.slice(j, (j += 16)); // The message is expanded into 64 words as part of the iteration
        var oldHash = hash;
        // This is now the undefinedworking hash", often labelled as variables a...g
        // (we have to truncate as well, otherwise extra entries at the end accumulate
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var i2 = i + j;
            // Expand the message into 64 words
            // Used below if
            var w15 = w[i - 15],
                w2 = w[i - 2];

            // Iterate
            var a = hash[0],
                e = hash[4];
            var temp1 =
                hash[7] +
                (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + // S1
                ((e & hash[5]) ^ (~e & hash[6])) + // ch
                k[i] +
                // Expand the message schedule if needed
                (w[i] =
                    i < 16
                        ? w[i]
                        : (w[i - 16] +
                              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + // s0
                              w[i - 7] +
                              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | // s1
                          0);
            // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
            var temp2 =
                (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + // S0
                ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj

            hash = [(temp1 + temp2) | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? 0 : '') + b.toString(16);
        }
    }
    return result;
}

/**
 * Displays a spinner in the button
 * @param {HTMLElement} button
 */
function setLoadButton(button) {
    //button.setAttribute('original-data', button.innerHTML);
    button.innerHTML = '<span class="spinner-border spinner-border-sm mx-3" role="status" aria-hidden="true"></span>';
    button.disabled = true;
}

/**
 * Displays a tick in the button that disapears after 1.5 seconds.
 * @param {HTMLElement} button
 */
function setDoneButton(button) {
    button.innerHTML = '<i class="bi bi-check2 mx-3"></i>';
    setTimeout(function () {
        unsetLoadButton(button);
    }, 1500);
}

/**
 * Resets the button to its initial state
 * @param {HTMLElement} button
 */
function unsetLoadButton(button) {
    button.innerHTML = button.getAttribute('original-data');
    button.disabled = false;
}

function randomInInterval(min, max) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * When item from a dropdown is clicked, toggle its associated checkbox
 * @param  {HTMLElement} element Element that was clicked
 */
function toggleCheckbox(element) {
    var checked = element.getAttribute('checked');
    if (checked == 'true') {
        element.querySelector('input').checked = false;
        checked = false;
    } else {
        element.querySelector('input').checked = true;
        checked = true;
    }
    element.setAttribute('checked', checked);
}

/**
 * Convert minutes to `H h M min` format
 * @param  {number} time Time in minutes
 * @return {string}
 */
function minutesToHoursMinutes(time) {
    var hours = Math.floor(time / 60);
    var minutes = Math.ceil(time % 60);

    if (minutes < 15) {
        minutes = 15;
    } else if (minutes < 30) {
        minutes = 30;
    } else if (minutes < 45) {
        minutes = 45;
    } else {
        hours++;
        minutes = 0;
    }

    if (hours == 0) {
        return minutes + 'min';
    } else {
        return hours + 'h' + (minutes != 0 ? ' ' + minutes + 'min' : '');
    }
}

/**
 * Compute days between two dates
 * @param  {Date | string}  date1 First date.
 * @param  {Date | string}  date2 Second date.
 * @param  {Boolean}        abs   If true, return is always > 0
 * @return {number}               Number of days between date1 and date2
 */
function daysBetween(date1, date2, abs = true) {
    if (typeof date1 == 'string') {
        date1 = new Date(date1);
    }
    if (typeof date2 == 'string') {
        date2 = new Date(date2);
    }
    // The number of milliseconds in one day
    const ONE_DAY = 1000 * 60 * 60 * 24;

    // Calculate the difference in milliseconds
    const differenceMs = abs ? Math.abs(date2 - date1) : date2 - date1;

    // Convert back to days and return
    return Math.round(differenceMs / ONE_DAY);
}

/**
 * Format a date as a string
 * @param  {Date}    date      Date to format
 * @param  {Boolean} iso       If true, returns ISO compliant date format
 * @param  {String}  separator Date separator
 * @return {String}            Converted date
 */
function getFormattedDate(date, iso = false, separator = '/') {
    if (typeof date == 'string') {
        date = new Date(date);
    }
    var d = date.getDate().toString().padStart(2, '0');
    var m = (date.getMonth() + 1).toString().padStart(2, '0');
    var y = date.getFullYear().toString().padStart(2, '0');

    if (iso) {
        return `${y}-${m}-${d}`;
    }

    return `${d}${separator}${m}${separator}${y}`;
}

/**
 * Convert hhmm or hh:mm format to minutes format, where 00:00 equals 0
 * @param  {string} time String to get time from
 * @return {number}      Converted value
 */
function getTime(time) {
    var result = 0;
    time = time.replace(':', '');
    if (time[0] == '+') {
        time = time.substring(1);
        result = 1440;
    }
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2));
    result += hour * 60 + minutes;
    return result;
}

/**
 * Convert minutes format to hh:mm, where 0 equals 00:00
 * @param  {number} time Number to get time from
 * @return {string}      Converted value
 */
function getTimeString(time) {
    var hours = Math.floor(time / 60);
    var minutes = Math.ceil((time / 60 - hours) * 60);
    while (minutes >= 60) {
        minutes -= 60;
        hours++;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get an array of dates between startDate and stopDate, including
 * @param  {Date}        startDate Starting date
 * @param  {Date}        stopDate  Ending date
 * @return {Array<Date>}           Array of dates
 */
function getDates(startDate, stopDate) {
    var dateArray = [];
    var currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}

/**
 * Checks if element is in view
 * https://codepen.io/jr-cologne/pen/zdYdmx
 * @param  {HTMLElement} element Element to check
 * @return {boolean}
 */
function inView(element) {
    var windowHeight = window.innerHeight;
    var scrollY = window.scrollY || window.pageYOffset;
    var scrollPosition = scrollY + windowHeight;
    var elementPosition = element.getBoundingClientRect().top + scrollY + 200;

    return scrollPosition > elementPosition;
}

// https://gist.github.com/ryancatalani/6091e50bf756088bf9bf5de2017b32e6
function drawCurve(start, end, map) {
    var latlngs = [];

    var offsetX = end[1] - start[1],
        offsetY = end[0] - start[0];

    var r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
        theta = Math.atan2(offsetY, offsetX);

    var thetaOffset = 3.14 / 10;

    var r2 = r / 2 / Math.cos(thetaOffset),
        theta2 = theta + thetaOffset;

    var midpointX = r2 * Math.cos(theta2) + start[1],
        midpointY = r2 * Math.sin(theta2) + start[0];

    var midpointLatLng = [midpointY, midpointX];

    latlngs.push(start, midpointLatLng, end);

    var pathOptions = {
        color: '#0d6efd',
        weight: 4,
    };

    return L.curve(['M', start, 'Q', midpointLatLng, end], pathOptions).addTo(map);
}
