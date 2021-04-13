/*jshint esversion: 8 */
const map = L.map('map', { zoomControl: false }).setView([40.41668800219981, -3.703785980719369], 15);
const startMap = L.map('startMap', { zoomControl: false }).setView([40.41668800219981, -3.703785980719369], 15);

var selectedPlace = -1;
var places = [];

var searchResults = [];
var searchTimeout;

var plan = {};
var popupStart = null;
var planStart;
var planLength = 0;

/*
 * Rendering functions
 */

/**
 * Create and display map.
 */
function setupMap() {
    // Main map
    L.control
        .zoom({
            position: 'bottomright',
        })
        .addTo(map);

    L.tileLayer(TILESERVER_ENDPOINT + '/{z}/{x}/{y}.png', {
        minZoom: 12,
        maxZoom: 17,
        attribution:
            '&copy; <a href="https://maptiler.com/copyright">MapTiler</a> | &copy; <a href="http://osm.org/copyright">OpenStreetMap contributors</a> ♥ <a class="text-success" href="https://donate.openstreetmap.org">Donar a OSM</a>',
    }).addTo(map);

    // Start map
    L.control
        .zoom({
            position: 'bottomright',
        })
        .addTo(startMap);

    L.tileLayer(TILESERVER_ENDPOINT + '/{z}/{x}/{y}.png', {
        minZoom: 12,
        maxZoom: 17,
        attribution:
            '&copy; <a href="https://maptiler.com/copyright">MapTiler</a> | &copy; <a href="http://osm.org/copyright">OpenStreetMap contributors</a> ♥ <a class="text-success" href="https://donate.openstreetmap.org">Donar a OSM</a>',
    }).addTo(startMap);

    startMap.on('click', onStartSet);
}

/**
 * Create the content of a marker popup
 * @param  {Place}  place Place to generate content
 * @return {string}       innerHTML of popup
 */
function createMarkerContent(place, added = false) {
    const address = [place.address, place.postalCode, place.city, place.state, place.country];

    // Create marker popup
    var carousel;
    if (place.images) {
        carousel = getTemplate('templatePopupCarousel');
        carousel.firstElementChild.setAttribute('id', 'carouselPopup' + place.id);
        carousel.querySelector('.carousel-control-prev').setAttribute('data-bs-target', '#carouselPopup' + place.id);
        carousel.querySelector('.carousel-control-next').setAttribute('data-bs-target', '#carouselPopup' + place.id);

        for (var j = 0; j < place.images; j++) {
            const item = getTemplate('templatePopupCarouselItem');
            if (j == 0) {
                item.querySelector('.carousel-item').classList.add('active');
            }
            item.querySelector('.carousel-item');
            item.querySelector('img').src = '/assets/places/' + place.id + '/' + j + '.jpg';
            carousel
                .querySelector('.carousel-inner')
                .insertBefore(item, carousel.querySelector('.carousel-inner').firstChild);
        }
    } else {
        carousel = getTemplate('templatePopupCarousel');
        carousel.firstElementChild.setAttribute('id', 'carouselPopup' + place.id);
        const item = getTemplate('templatePopupCarouselItem');
        item.querySelector('.carousel-item').classList.add('active');
        carousel
            .querySelector('.carousel-inner')
            .insertBefore(item, carousel.querySelector('.carousel-inner').firstChild);
    }

    const content = getTemplate('templatePopupContent');
    content.querySelector('.title').innerHTML = place.name;
    content.querySelector('.address').innerHTML += address.join(', ');
    content.querySelector('.btn').setAttribute('id', 'buttonPlace' + place.id);

    if (place.wikipedia) {
        content.querySelector('.wikipedia').href = 'https://wikipedia.org/wiki/' + place.wikipedia;
    } else {
        content.querySelector('.wikipedia').remove();
    }

    if (!place.phone && !place.placeUrl) {
        content.querySelector('.contact-pl').remove();
    } else {
        if (place.phone) {
            content.querySelector('.phone a').innerHTML = place.phone;
            content.querySelector('.phone a').href = 'tel:' + place.phone.replace(' ', '');
        } else {
            content.querySelector('.phone').remove();
        }

        if (place.placeUrl) {
            content.querySelector('.url a').href = place.placeUrl;
        } else {
            content.querySelector('.url').remove();
        }
    }

    if (!place.twitter && !place.facebook && !place.instagram) {
        content.querySelector('.contact-sn').remove();
    } else {
        if (place.twitter) {
            content.querySelector('.twitter a').href = 'https://twitter.com/' + place.twitter;
        } else {
            content.querySelector('.twitter').remove();
        }

        if (place.instagram) {
            content.querySelector('.instagram a').href = 'https://instagram.com/' + place.instagram;
        } else {
            content.querySelector('.instagram').remove();
        }

        if (place.facebook) {
            content.querySelector('.facebook a').href = 'https://facebook.com/' + place.facebook;
        } else {
            content.querySelector('.facebook').remove();
        }
    }

    content.querySelector('.actions').setAttribute('placeId', place.id);
    if (added) {
        content.querySelector('.actions').querySelector('.add-to-plan').classList.add('d-none');
        content.querySelector('.actions').querySelector('.remove-from-plan').classList.remove('d-none');
    }

    return carousel.firstElementChild.outerHTML + content.firstElementChild.outerHTML;
}

/**
 * Render a list of places in the sidebar
 * @param  {Array<Place>} places Array of places to render
 */
function renderPlaces(places) {
    var list = document.querySelector('#places');
    list.innerHTML = '';

    for (let i = 0; i < places.length; i++) {
        const place = places[i];

        // Place marker on map
        places[i].marker = L.marker([place.lat, place.lon], {
            title: place.name,
            placeId: place.id,
        })
            .addTo(map)
            .bindPopup(createMarkerContent(places[i]))
            .on('click', function (e) {
                const id = parseInt(e.target.options.placeId);
                selectPlaceById(id);
            });

        // Add place to list
        const card = getTemplate('templateCard');
        card.querySelector('.card').setAttribute('id', 'placeCard' + place.id);
        card.querySelector('.card').setAttribute('placeId', place.id);
        card.querySelector('.card-title').innerHTML = place.name;
        card.querySelector('.card-categories').innerHTML = place.categories.join(', ');
        if (place.description) {
            card.querySelector('.card-text').innerHTML = place.description;
        } else {
            card.querySelector('.card-text').remove();
        }

        card.querySelector('.time').innerHTML +=
            ' ' + (place.timeSpent ? minutesToHoursMinutes(place.timeSpent * 60) : '?');
        card.querySelector('.rating').innerHTML += ' ' + place.rating.toFixed(1);
        card.querySelector('.prediction').innerHTML += ' ' + (place.probability * 100).toFixed(0) + '%';

        list.appendChild(card);
    }

    document.querySelector('#placeCount').innerHTML = places.length;
    console.log('Rendered places');
}

/**
 * Select a place by its ID, scroll to its element on the sidebar
 * and display a border
 * @param  {number} id ID of place
 */
function selectPlaceById(id) {
    if (document.querySelector('#placeCard' + selectedPlace)) {
        document.querySelector('#placeCard' + selectedPlace).classList.remove('border-primary');
    }
    document.querySelector('#placeCard' + id).classList.add('border-primary');
    document.querySelector('#placeCard' + id).scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    selectedPlace = id;
}

/**
 * Given a sidebar card, select the place and show its corresponding popup
 * @param  {HTMLElement} place Sidebar card element
 */
function selectPlaceByElement(place) {
    var id = parseInt(place.getAttribute('id').replace('placeCard', ''));
    getElementByKey(places, 'id', id).marker.openPopup();
    selectPlaceById(id);
}

/*
 * Search functions
 */

/**
 * Search for places
 * @param  {HTMLElement} input Element to get query from
 */
function searchPlaces(input) {
    var loading = document.querySelector('#searchPlaceholder').getAttribute('loading');
    if (!loading || loading == 'false') {
        setLoadButton(document.querySelector('#searchPlaceholder'));
        document.querySelector('#searchPlaceholder').setAttribute('loading', true);
    }

    document.querySelector('#searchItems').innerHTML = '';
    searchResults = [];

    if (input.value.length == 0) {
        unsetLoadButton(document.querySelector('#searchPlaceholder'));
        document.querySelector('#searchPlaceholder').setAttribute('loading', false);
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () {
        get(ENDPOINTS.placesSearch + '/' + input.value)
            .then((res) => {
                res = res.result.splice(0, 5);
                searchResults = res;

                for (var i = 0; i < res.length; i++) {
                    var searchItem = getTemplate('templateSearchItem');
                    searchItem.querySelector('a').setAttribute('placeId', res[i].id);
                    searchItem.querySelector('.title').innerHTML = res[i].name;
                    searchItem.querySelector('.categories').innerHTML = '(' + res[i].categories.join(', ') + ')';
                    searchItem.querySelector('.description').innerHTML = res[i].description;
                    document.querySelector('#searchItems').appendChild(searchItem);
                }

                unsetLoadButton(document.querySelector('#searchPlaceholder'));
                document.querySelector('#searchPlaceholder').setAttribute('loading', false);
            })
            .catch((err) => {
                throwError(err);
                unsetLoadButton(document.querySelector('#searchPlaceholder'));
                document.querySelector('#searchPlaceholder').setAttribute('loading', false);
            });

        unsetLoadButton(document.querySelector('#searchPlaceholder'));
        document.querySelector('#searchPlaceholder').setAttribute('loading', false);
    }, 1000);
}

/**
 * Display on map search result
 * @param  {HTMLElement} element Element from search results
 */
function displaySearchResult(element) {
    const placeId = parseInt(element.getAttribute('placeId'));

    if (getElementByKey(places, 'id', placeId)) {
        selectPlaceByElement(document.querySelector('#placeCard' + placeId));
    } else {
        var place = getElementByKey(searchResults, 'id', placeId);
        var popup = L.popup();
        popup.setLatLng([place.lat, place.lon]).setContent(createMarkerContent(place)).openOn(map);
    }
}

/*
 * Places functions
 */
/**
 * Add a new place into places array, fetching info from server
 * @param {number}  placeId     ID of place
 * @param {Boolean} recommended Set recommended key
 */
function addPlace(placeId, recommended = true) {
    return new Promise((resolve, reject) => {
        get(ENDPOINTS.placeInfo + '/' + placeId)
            .then((res) => {
                var place = res.place;
                // Place marker on map
                place.marker = L.marker([place.lat, place.lon], {
                    title: place.name,
                    placeId: place.id,
                })
                    .addTo(map)
                    .bindPopup(createMarkerContent(place))
                    .on('click', function (e) {
                        const id = parseInt(e.target.options.placeId);
                        selectPlaceById(id);
                    });

                // Add place to list
                const card = getTemplate('templateCard');
                card.querySelector('.card').setAttribute('id', 'placeCard' + place.id);
                card.querySelector('.card').setAttribute('placeId', place.id);
                card.querySelector('.card-title').innerHTML = place.name;
                card.querySelector('.card-categories').innerHTML = place.categories.join(', ');
                if (place.description) {
                    card.querySelector('.card-text').innerHTML = place.description;
                } else {
                    card.querySelector('.card-text').remove();
                }

                card.querySelector('.time').innerHTML +=
                    ' ' + (place.timeSpent ? minutesToHoursMinutes(place.timeSpent * 60) : '?');
                card.querySelector('.rating').innerHTML += ' ' + place.rating.toFixed(1);
                card.querySelector('.prediction').remove();

                document.querySelector('#places').appendChild(card);

                place.recommended = recommended;

                places.push(place);

                resolve(place);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/*
 * Plan functions
 */
/**
 * Save plan to localStorage
 */
function saveToLocalStorage() {
    console.log('Saving to localStorage');
    localStorage.setItem('plan', JSON.stringify(plan));
}

/**
 * Load data from localStorage
 */
function loadFromLocalStorage() {
    console.log('Loading from localStorage');
    var data = localStorage.getItem('plan');
    if (data) {
        data = JSON.parse(data);
        var ids = Object.keys(data);
        for (var i = 0; i < ids.length; i++) {
            addToPlan(null, ids[i], false);
        }
    }
}

/**
 * Add place to plan. If plan is not in places array, fetches data from server
 * and adds it into the places list
 * @param {HTMLElement} button Button that triggered the function
 * @param {number}      id     ID of place
 * @param {Boolean}     saveLs Flag to store into localStorage
 */
async function addToPlan(button, id = null, saveLs = true) {
    var placeId;
    if (id) {
        placeId = id;
    } else {
        placeId = parseInt(button.parentElement.getAttribute('placeId'));
    }

    // Update buttons
    if (button) {
        button.classList.add('d-none');
        button.parentElement.querySelector('.remove-from-plan').classList.remove('d-none');
    }
    document.querySelector('#clearPlanPrompter').classList.remove('d-none');

    var place = getElementByKey(places, 'id', placeId);
    // If place is in recommendations, push to plan
    if (place && (place.recommended == undefined || place.recommended)) {
        // Add to plan and save in localStorage
        plan[placeId] = true;
        if (saveLs) saveToLocalStorage();

        // Mark in UI
        markPlaceInPlanById(placeId, place);

        // Update selected count and enable button if reached threshold
        document.querySelector('#selectedCount').innerHTML = Object.keys(plan).length;
        if (Object.keys(plan).length >= 3) {
            document.querySelector('#planButton').disabled = false;
        }
    }
    // If place is not in recommendations, get info,
    // add to sidebar and map, and push to plan
    else {
        try {
            // Add to plan and save in localStorage
            place = await addPlace(placeId, false);
            plan[placeId] = false;
            if (saveLs) saveToLocalStorage();

            // Mark in UI
            markPlaceInPlanById(placeId, place);

            // Update selected count and enable button if reached threshold
            document.querySelector('#selectedCount').innerHTML = Object.keys(plan).length;
            if (Object.keys(plan).length >= 3) {
                document.querySelector('#planButton').disabled = false;
            }

            // Update total number of places to explore
            document.querySelector('#placeCount').innerHTML = places.length;
        } catch (err) {
            throwError(err);
        }
    }
}

/**
 * Remove place from plan
 * @param {HTMLElement} button Button that triggered the function
 */
async function removeFromPlan(button) {
    var placeId = parseInt(button.parentElement.getAttribute('placeId'));
    if (button.parentElement.querySelector('.remove-from-plan')) {
        button.parentElement.querySelector('.add-to-plan').classList.remove('d-none');
        button.parentElement.querySelector('.remove-from-plan').classList.add('d-none');
    }

    // Unmark in UI
    unmarkPlaceInPlanById(placeId, getElementByKey(places, 'id', placeId));

    // Remove from plan and save to localStorage
    delete plan[placeId];
    saveToLocalStorage();

    if (Object.keys(plan).length == 0) {
        document.querySelector('#clearPlanPrompter').classList.add('d-none');
    }

    // Update selected count and disable button if reached threshold
    document.querySelector('#selectedCount').innerHTML = Object.keys(plan).length;
    if (Object.keys(plan).length < 3) {
        document.querySelector('#planButton').disabled = true;
    }
}

/**
 * Clears the current plan
 */
function clearPlan() {
    document.querySelector('#clearPlanPrompter').classList.add('d-none');
    var ids = Object.keys(plan);
    map.closePopup();
    for (var i = 0; i < ids.length; i++) {
        unmarkPlaceInPlanById(ids[i], getElementByKey(places, 'id', ids[i]));
    }
    plan = {};

    // Update selected count and disable button
    document.querySelector('#selectedCount').innerHTML = Object.keys(plan).length;
    document.querySelector('#planButton').disabled = true;
}

function markPlaceInPlanById(id, place) {
    document.querySelector('#placeCard' + id).classList.add('border-success');
    document
        .querySelector('#placeCard' + id)
        .querySelector('.remove')
        .classList.remove('d-none');
    place.marker._popup._content = createMarkerContent(place, true);
    place.marker.setIcon(greenIcon);
}

function unmarkPlaceInPlanById(id, place) {
    document.querySelector('#placeCard' + id).classList.remove('border-success');
    document
        .querySelector('#placeCard' + id)
        .querySelector('.remove')
        .classList.add('d-none');
    place.marker._popup._content = createMarkerContent(place, false);
    place.marker.setIcon(blueIcon);
}

/*
 * Create plan functions
 */
/**
 * When Plan map is clicked, creates a popup and saves latitude and longitude.
 * @param  {object} e Click event
 */
function onStartSet(e) {
    if (popupStart == null) {
        popupStart = L.marker(e.latlng).addTo(startMap);
    } else {
        popupStart.setLatLng(e.latlng);
    }
    planStart = e.latlng;
    document.querySelector('#startNextButton').disabled = false;
}
startMap.on('click', onStartSet);

/**
 * Check if inputs in info tab are valid
 */
function checkInfo() {
    document.querySelector('#createPlanButton').disabled = true;
    document.querySelector('#infoNextButton').disabled = true;
    if (document.querySelector('#planName').value.length == 0) {
        document.querySelector('#planNameValidation').classList.remove('d-none');
        return false;
    } else {
        document.querySelector('#planNameValidation').classList.add('d-none');
    }

    document.querySelector('#infoNextButton').disabled = false;
    return true;
}

/**
 * Check if inputs in times tab are valid
 */
function checkTimes(element) {
    document.querySelector('#createPlanButton').disabled = true;
    document.querySelector('#timesNextButton').disabled = true;

    var id = element ? element.getAttribute('id') : '';

    switch (id) {
        case 'timeStart':
            document.querySelector('#timeEnd').min = element.value;
            break;
        case 'timeEnd':
            document.querySelector('#timeStart').max = element.value;
            break;
        case 'timeStart':
            document.querySelector('#timeEnd').min = element.value;
            break;
        case 'timeEnd':
            document.querySelector('#timeStart').max = element.value;
            break;
    }

    var valid = true;
    if (
        document.querySelector('#timeStart').value == '' ||
        document.querySelector('#timeEnd').value == '' ||
        getTime(document.querySelector('#timeStart').value) > getTime(document.querySelector('#timeEnd').value)
    ) {
        document.querySelector('#timeValidation').classList.remove('d-none');
        valid = false;
    } else {
        document.querySelector('#timeValidation').classList.add('d-none');
    }

    if (!valid) {
        return false;
    } else {
        document.querySelector('#timesNextButton').disabled = false;
        return true;
    }
}

/**
 * Get recommended day length from server
 */
function _getDayHeuristic() {
    return new Promise((resolve, reject) => {

        var request = {
            places: Object.keys(plan).map((place) => {
                return parseInt(place);
            }),
            dayStart: getTime(document.querySelector('#timeStart').value),
            dayEnd: getTime(document.querySelector('#timeEnd').value),
            start: {
                lat: planStart.lat,
                lon: planStart.lng,
            },
        };

        post(ENDPOINTS.plannerLength, request)
            .then((res) => {
                document.querySelector('#recommendedDayLength').innerHTML = res.days + ' días';
                document.querySelector('#recommendedDayLengthValidate').innerHTML = res.days + ' días';
                planLength = res.days;
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Check if recommended length can be fetched and fetch if true
 */
function getDayHeuristic() {
    document.querySelector('#recommendedDayLength').innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
    _getDayHeuristic()
        .then(() => {})
        .catch((err) => {
            console.log("Missing data");
        });
}

/**
 * Check if inputs in days tab are valid
 */
function checkDays() {
    document.querySelector('#createPlanButton').disabled = true;

    var valid = true;
    if (!checkInfo()) {
        console.log('Invalid info');
        valid = false;
    }
    if (!checkTimes()) {
        console.log('Invalid times');
        valid = false;
    }

    if (
        document.querySelector('#daysStart').value == '' ||
        document.querySelector('#daysEnd').value == '' ||
        new Date(document.querySelector('#daysStart').value) > new Date(document.querySelector('#daysEnd').value)
    ) {
        document.querySelector('#daysValidation').classList.remove('d-none');
        valid = false;
    } else {
        document.querySelector('#daysValidation').classList.add('d-none');
    }

    if (
        document.querySelector('#daysStart').value == '' ||
        document.querySelector('#daysEnd').value == '' ||
        daysBetween(
            new Date(document.querySelector('#daysStart').value),
            new Date(document.querySelector('#daysEnd').value)
        ) +
            2 <
            planLength
    ) {
        document.querySelector('#daysValidationLength').classList.remove('d-none');
        valid = false;
    } else {
        document.querySelector('#daysValidationLength').classList.add('d-none');
    }

    if (!valid) {
        return false;
    } else {
        document.querySelector('#createPlanButton').disabled = false;
        return true;
    }
}

/**
 * Send a request to create a new plan
 */
function createPlan() {
    var request = {
        name: document.querySelector('#planName').value,
        description: document.querySelector('#planDescription').value,
        places: Object.keys(plan).map((place) => {
            return parseInt(place);
        }),
        dayStart: getTime(document.querySelector('#timeStart').value),
        dayEnd: getTime(document.querySelector('#timeEnd').value),
        start: {
            lat: planStart.lat,
            lon: planStart.lng,
        },
        startDate: new Date(document.querySelector('#daysStart').value),
        endDate: new Date(document.querySelector('#daysEnd').value),
    };

    post(ENDPOINTS.plannerCreate, request)
        .then((res) => {
            window.location = '/plans/plan/?id=' + res.id;
        })
        .catch((err) => {
            throwError(err);
        });

    return false;
}

async function main() {
    setupMap();

    document.querySelector('#daysStart').min = getFormattedDate(new Date(), true);
    document.querySelector('#daysEnd').min = getFormattedDate(new Date(), true);

    try {
        const request = await get(ENDPOINTS.recommendationsGet);
        places = request.places;
        request.random.forEach((place) => {
            const random = randomInInterval(Math.ceil(places.length / 3), places.length);
            const ratingMax = places[random - 1] ? places[random - 1].probability * 100 : 100;
            const ratingMin = places[random] ? places[random].probability * 100 : 50;
            place.probability = randomInInterval(ratingMin, ratingMax) / 100;
            places.splice(random, 0, place);
        });

        renderPlaces(places);

        loadFromLocalStorage();
    } catch (err) {
        throwError(e);
    }
}

main();
