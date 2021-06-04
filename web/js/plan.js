/* jshint esversion: 8 */
var loader;
var statusModal;
var statusInterval;
const urlParams = new URLSearchParams(window.location.search);
const id = parseInt(urlParams.get('id'));
var map;

var plan;
var originalPlan;
var edit = false;

var dates;
var currentDay = 0;

var searchPlaces = [];
var suggestionPlaces = [];
var searchMode = 'suggestions';

var layers = [];

/*
 * Map things
 */
/**
 * Create and display map.
 * @param  {Array<number>} start Starting point of the route
 */
function setupMap(start) {
    map = L.map('map', { zoomControl: false }).setView(start, 17);
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
}

/**
 * Create the content of a marker popup
 * @param  {Place}  place Place to generate content
 * @return {string}       innerHTML of popup
 */
function createMarkerContent(place) {
    const address = [place.address, place.postalCode, place.city, place.state, place.country];

    // Create marker popup
    const content = getTemplate('templatePopupContent');
    content.querySelector('.title').innerHTML = place.name;
    content.querySelector('.address').innerHTML += address.join(', ');

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

    return content.firstElementChild.outerHTML;
}

/**
 * Render markers and lines between markers in the map
 * @param  {object} plan Plan to render coordinates from
 * @param  {number} day  Day to render
 */
function renderPoints(plan, day) {
    var coords = [];
    for (let i = 0; i < layers.length; i++) {
        map.removeLayer(layers[i]);
    }
    for (let i = 0; i < plan.days[day].route.length; i++) {
        if (plan.days[day].route[i].lat && plan.days[day].route[i].lon) {
            if (plan.days[day].route[i].type == 1) {
                plan.days[day].route[i].place.name = plan.days[day].route[i].name;
                plan.days[day].route[i].place.description = plan.days[day].route[i].description;
            }
            coords.push({
                place: plan.days[day].route[i].type == 1 ? plan.days[day].route[i].place : null,
                coords: [plan.days[day].route[i].lat, plan.days[day].route[i].lon],
            });
        }
    }

    var getMarkerPopup = function (item) {
        var marker = L.marker(item.coords).addTo(map);
        if (item.place) {
            marker.bindPopup(createMarkerContent(item.place));
            marker.setIcon(getMarker(item.place.categoriesId));
        } else {
            marker.bindPopup(getTemplate('templatePopupStart').firstElementChild.outerHTML);
        }

        return marker;
    };

    coords[0] = { coords: [plan.startLat, plan.startLon] };
    layers.push(getMarkerPopup(coords[0]));
    for (var i = 0; i < coords.length - 1; i++) {
        layers.push(drawCurve(coords[i].coords, coords[i + 1].coords, map));
        layers.push(getMarkerPopup(coords[i + 1]));
    }
    // Assumes first item is start, which should be, as plan is sorted
}

/*
 * Render functions
 */
/**
 * Change the name that apears in the header. If name is longer that 22 characters, name is truncated
 * @param  {string} name Name to set
 */
function renderHeaderName(name) {
    if (name.length > 22) {
        name = name.substring(0, 22) + '...';
    }
    document.querySelector('#headerName').innerHTML = name;
}
/**
 * Get the element that shows the corresponding status.
 * @param  {number} state Plan status
 * @return {HTMLElement}       Element that describes plan status.
 */
function resolveState(state) {
    switch (state) {
        case -1:
            return getTemplate('templateInternalError');
        case 0:
            return getTemplate('templateActive');
        case 1:
            return getTemplate('templatePlanning');
        case 2:
            return getTemplate('templateTimedout');
        case 3:
            return getTemplate('templateTimedout');
        case 4:
            return getTemplate('templateDone');
    }
}

/**
 * Change to next day
 * @param  {HTMLElement} button Next day button
 */
function nextDay(button) {
    if (!checkTimes()) {
        return;
    }
    document.querySelector('#prev').disabled = false;
    if (currentDay <= dates.length - 1) {
        currentDay++;
    }
    if (currentDay == dates.length - 1) {
        button.disabled = true;
    }
    renderPlan(plan, currentDay);
    if (edit) {
        editMode(document.querySelector('#planning'));
    }
}

/**
 * Change to previous day
 * @param  {HTMLElement} button Previous day button
 */
function prevDay(button) {
    if (!checkTimes()) {
        return;
    }
    document.querySelector('#next').disabled = false;
    if (currentDay >= 0) {
        currentDay--;
    }
    if (currentDay == 0) {
        button.disabled = true;
    }
    renderPlan(plan, currentDay);
    if (edit) {
        editMode(document.querySelector('#planning'));
    }
}

/**
 * Render plan info in page header
 * @param  {object} plan Plan info to render
 */
function renderPlanInfo(plan) {
    document.querySelector('#planning').innerHTML = '';
    document.querySelector('#days').innerHTML = plural(daysBetween(plan.startDate, plan.endDate) + 1, 'día');
    document.querySelector('#start-date').value = getFormattedDate(plan.startDate, true);
    document.querySelector('#end-date').value = getFormattedDate(plan.endDate, true);
    document.querySelector('#start-date').min = getFormattedDate(new Date(), true);
    document.querySelector('#end-date').min = getFormattedDate(new Date(), true);
    document.querySelector('#name').value = plan.name;
    document.querySelector('#description').value = plan.description;
    document.querySelector('#status').innerHTML = '';
    document.querySelector('#status').appendChild(resolveState(plan.status));
    renderHeaderName(plan.name);
}

/**
 * Return an HTML object to render a place into the page body
 * @param  {object} item Place to render
 * @return {HTMLElement}      Item element to render
 */
function renderPlace(item) {
    const card = getTemplate('templateCardPlace');

    card.querySelector('.time-start').innerHTML = item.startTime;
    card.querySelector('.title').innerHTML = item.name;
    card.querySelector('.time').value = item.timeSpent;
    card.querySelector('.description').innerHTML = item.description;
    card.querySelector('.time-end').innerHTML = item.endTime;
    card.querySelector('.maps').href = item.place.gmapsUrl;
    card.querySelector('.notes').value = item.notes;
    if (item.place.phone) {
        card.querySelector('.phone').href = 'tel:' + item.place.phone.replace(' ', '');
    } else {
        card.querySelector('.phone').remove();
    }
    if (item.place.wikipedia) {
        card.querySelector('.wiki').href = 'https://es.wikipedia.org/wiki/' + item.place.wikipedia;
    } else {
        card.querySelector('.wiki').remove();
    }
    if (item.place.placeUrl) {
        card.querySelector('.link').href = item.place.placeUrl;
    } else {
        card.querySelector('.link').remove();
    }
    if (item.place.twitter) {
        card.querySelector('.twitter').href = 'https://twitter.com/' + item.place.twitter;
    } else {
        card.querySelector('.twitter').remove();
    }
    if (item.place.instagram) {
        card.querySelector('.instagram').href = 'https://instagram.com/' + item.place.instagram;
    } else {
        card.querySelector('.instagram').remove();
    }
    if (item.place.facebook) {
        card.querySelector('.facebook').href = 'https://facebook.com/' + item.place.facebook;
    } else {
        card.querySelector('.facebook').remove();
    }

    if (item.place.images > 0) {
        card.querySelector('img').setAttribute("data-src", '/assets/places/' + item.place.id + '/0.jpg');
        card.querySelector('img').setAttribute("alt", `Imagen de ${item.place.name}`);
    } else {
        card.querySelector('img').setAttribute("data-src", '/assets/default_image.png');
        card.querySelector('img').setAttribute("alt", `Imagen de ${item.place.name}`);
    }

    return card;
}

/**
 * Return an HTML object to render a starting point into the page body
 * @param  {object} item Starting point to render
 * @return {HTMLElement}      Item element to render
 */
function renderStart(plan, item) {
    const card = getTemplate('templateCardStart');
    card.querySelector('.maps').href = 'https://www.google.com/maps/@' + plan.startLat + ',' + plan.startLon + ',18z';
    card.querySelector('.time-end').innerHTML = item.endTime;
    return card;
}

/**
 * Return an HTML object to render a wait into the page body
 * @param  {object} item Wait to render
 * @return {HTMLElement}      Item element to render
 */
function renderWait(item) {
    const card = getTemplate('templateCardWait');
    card.querySelector('.time-start').innerHTML = item.startTime;
    card.querySelector('.time').value = item.timeSpent;
    card.querySelector('.time-end').innerHTML = item.endTime;
    return card;
}

/**
 * Return an HTML object to render a rest into the page body
 * @param  {object} item Rest to render
 * @return {HTMLElement}      Item element to render
 */
function renderRest(item) {
    const card = getTemplate('templateCardRest');
    card.querySelector('.time-start').innerHTML = item.startTime;
    card.querySelector('.time').value = item.timeSpent;
    card.querySelector('.time-end').innerHTML = item.endTime;
    card.querySelector('.notes').value = item.notes;
    return card;
}

/**
 * Return an HTML object to render a custom place into the page body
 * @param  {object} item Custom place to render
 * @return {HTMLElement}      Item element to render
 */
function renderCustom(item) {
    const card = getTemplate('templateCardCustom');
    card.querySelector('.time-start').innerHTML = item.startTime;
    card.querySelector('.time').value = item.timeSpent;
    card.querySelector('.time-end').innerHTML = item.endTime;
    card.querySelector('.notes').value = item.notes;
    return card;
}

/**
 * Render the route of a plan for a given day
 * @param  {object} plan Plan data
 * @param  {number} day  Day to render
 */
function renderPlan(plan, day) {
    document.querySelector('#planning').innerHTML = '';
    document.querySelector('#mainPlan').classList.remove('d-none');
    const route = plan.days[day];
    document.querySelector('#displayDay').innerHTML = getFormattedDate(dates[route.day]);

    for (var i = 0; i < route.route.length; i++) {
        var item = route.route[i];
        var card;
        switch (item.type) {
            case 0:
                card = renderEmpty(item);
                break;
            case 1:
                card = renderPlace(item);
                break;
            case 2:
                card = renderStart(plan, item);
                break;
            case 3:
                card = renderWait(item);
                break;
            case 4:
                card = renderRest(item);
                break;
            case 5:
                card = renderCustom(item);
                break;
        }

        card.querySelector('.item').setAttribute('routeIndex', i);

        if (item.type == 5 || item.type == 3 || item.type == 4) {
            card.querySelector('.time-start').remove();
        }

        if (card.querySelector('.time')) {
            card.querySelector('.time').addEventListener('change', (e) => {
                updateCustomTime(e.target);
            });
        }
        if (card.querySelector('.remove')) {
            card.querySelector('.remove').addEventListener('click', (e) => {
                removeItem(e.target.closest('.btn'));
            });
        }
        if (card.querySelector('.notes')) {
            card.querySelector('.notes').addEventListener('change', (e) => {
                updateNotes(e.target);
            });
        }

        // Insertion buttons
        card.querySelector('.insert-place').addEventListener('click', (e) => {
            openInsertPlace(e.target.closest('.btn'));
        });
        card.querySelector('.insert-custom').addEventListener('click', (e) => {
            insertCustom(e.target.closest('.btn'));
        });
        card.querySelector('.insert-rest').addEventListener('click', (e) => {
            insertRest(e.target.closest('.btn'));
        });
        card.querySelector('.insert-wait').addEventListener('click', (e) => {
            insertWait(e.target.closest('.btn'));
        });

        if (
            item.type != 1 &&
            item.type != 2 &&
            item.travelNext <= 0 &&
            route.route[i + 1] &&
            route.route[i + 1].type == 1
        ) {
            card.querySelector('.time-end').remove();
        }

        document.querySelector('#planning').appendChild(card);

        if (item.travelNext > 0) {
            const travel = getTemplate('templateTravel');
            if (item.travelMode == 'car') {
                travel.querySelector('.fa-car').classList.remove('d-none');
                travel.querySelector('.fa-walking').classList.add('d-none');
            }
            travel.querySelector('.time').innerHTML = plural(item.travelNext, 'minuto');
            if (item.travelDist < 1000) {
                travel.querySelector('.distance').innerHTML = plural(item.travelDist, 'metro');
            } else {
                travel.querySelector('.distance').innerHTML = plural(
                    parseInt((item.travelDist / 1000).toFixed(2)),
                    'kilómetro'
                );
            }
            document.querySelector('#planning').appendChild(travel);
        }
    }

    // Render places in map
    renderPoints(plan, day);

    // Lazyload images
    yall();
}

/**
 * Show header text if main plan is in view
 */
function showHeader() {
    if (inView(document.querySelector('#mainPlan'))) {
        document.querySelector('#headerInfo').classList.remove('d-none');
        document.querySelector('#goToTop').classList.remove('d-none');
    } else {
        document.querySelector('#headerInfo').classList.add('d-none');
        document.querySelector('#goToTop').classList.add('d-none');
    }
}

/**
 * Create an interval to check every 5 seconds if the plan status changed
 */
function startIntervalStatus() {
    statusInterval = setInterval(async function () {
        try {
            let res = await post(ENDPOINTS.plannerGet, { id: id });
            if (res.plan.status == 1) {
                document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.add('d-none');
                document.querySelector('#planStatus').querySelector('#internalErrorStatus').classList.add('d-none');
                document.querySelector('#planStatus').querySelector('#planningStatus').classList.remove('d-none');
                statusModal.show();
            } else if (res.plan.status == 2 || res.plan.status == 3) {
                document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.remove('d-none');
                document.querySelector('#planStatus').querySelector('#internalErrorStatus').classList.add('d-none');
                document.querySelector('#planStatus').querySelector('#planningStatus').classList.add('d-none');
                statusModal.show();
            } else if (res.plan.status == 4) {
                document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.add('d-none');
                document.querySelector('#planStatus').querySelector('#internalErrorStatus').classList.remove('d-none');
                document.querySelector('#planStatus').querySelector('#planningStatus').classList.add('d-none');
                statusModal.show();
            } else {
                window.location.reload();
            }
        } catch (err) {
            throwError(err);
        }
    }, 5000);
}

/**
 * Return the item's name and description
 * @param  {object} item Item to get name and description from
 * @return {{name: string, description: string}} Name and description of the item
 */
function getNameDescription(item) {
    var name;
    var description;

    switch (item.type) {
        case 1:
            name = item.place.name;
            description = item.place.description;
            break;
        case 2:
            name = 'Inicio';
            description = 'Este es tu punto de inicio.';
            break;
        case 3:
            name = 'Esperar';
            description =
                'El siguiente lugar a visitar aún no ha abierto, por lo que tendrás que esperar hasta que abra.';
            break;
        case 4:
            name = 'Descanso';
            description = 'Este es el período de descanso que has definido al crear el plan';
            break;
        case 5:
            name = 'Personalizado';
            description = '';
            break;
        default:
            name = 'Sin asignar';
            description = '';
            break;
    }

    return {
        name: name,
        description: description,
    };
}

/**
 * Parse a plan. Splits the item array returned by server into day routes
 * @param  {object} data  Plan data
 * @param  {Array} items Item data
 */
function parsePlan(data, items) {
    var currentDay = 0;
    data.startDate = new Date(data.startDate);
    data.endDate = new Date(data.endDate);
    dates = getDates(data.startDate, data.endDate);
    days = {};
    for (let i = 0; i < items.length; i++) {
        if (!days[currentDay]) {
            days[currentDay] = {
                day: currentDay,
                route: [],
            };
        }

        const item = items[i];

        item.timeSpent = item.timeSpent;
        days[currentDay].route.push(item);

        if (item.travelNext == -1) {
            currentDay++;
        }
    }

    for (let i = 0; i < dates.length; i++) {
        if (!days[i]) {
            days[i] = {
                day: i,
                dayText: getFormattedDate(dates[i]),
                route: [
                    {
                        name: 'Inicio',
                        description: 'Este es tu punto de inicio.',
                        startTime: getTimeString(data.dayStart),
                        endTime: getTimeString(data.dayStart),
                        timeSpent: 0,
                        travelNext: -1,
                        type: 2,
                    },
                ],
            };
        }
    }

    var finalPlan = {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
        startLat: data.startLat,
        startLon: data.startLon,
        days: days,
    };

    // Deep clone
    plan = JSON.parse(JSON.stringify(finalPlan));
    originalPlan = JSON.parse(JSON.stringify(finalPlan));
}

/**
 * Loads a plan, parsing its data and rendering it into the page body.
 * @param  {object}  data  Result data returned by server
 * @param  {Boolean} parse If true, data is parsed
 */
function loadPlan(data, parse = true) {
    if (parse) {
        parsePlan(data.plan, data.items);
    }
    renderPlanInfo(plan);

    // Render corresponding date
    var d = dates.map((date) => {
        return date.toDateString();
    });
    var today = new Date();
    if (d.includes(today.toDateString())) {
        currentDay = d.indexOf(today.toDateString());
    }
    if (currentDay == dates.length - 1) {
        document.querySelector('#next').disabled = true;
    }
    if (currentDay == 0) {
        document.querySelector('#prev').disabled = true;
    }

    if (dates[0] < new Date()) {
        document.querySelector('#start-date').classList.remove('edit-mode-disable');
    }

    if (dates[dates.length - 1].addDays(1) < new Date()) {
        document.querySelector('#editButtonHeader').disabled = true;
        document.querySelector('#editButton').disabled = true;
    }

    renderPlan(plan, currentDay);
}

/**
 * Deletes a plan
 * @param  {HTMLElement} button Button that perfomed the action
 */
function deletePlan(button) {
    setLoadButton(button);
    post(ENDPOINTS.plannerDelete, { id: id })
        .then((res) => {
            button.closest('.modal').querySelector('.btn-close').click();
            unsetLoadButton(button);
            window.location = '/plans/';
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
}

/**
 * Toggles edit mode in the container
 * @param  {HTMLElement} container
 */
function editMode(container = document) {
    var disable = container.querySelectorAll('.edit-mode-disable');
    var show = container.querySelectorAll('.edit-mode-show');
    var hide = container.querySelectorAll('.edit-mode-hide');

    disable.forEach((element) => {
        element.disabled = !element.disabled;
    });

    show.forEach((element) => {
        element.classList.remove('d-none');
    });

    hide.forEach((element) => {
        element.classList.add('d-none');
    });
}

/**
 * Cancels edit mode and restores to unmodified data
 */
function cancelEdit() {
    var disable = document.querySelectorAll('.edit-mode-disable');
    var show = document.querySelectorAll('.edit-mode-show');
    var hide = document.querySelectorAll('.edit-mode-hide');

    disable.forEach((element) => {
        element.disabled = !element.disabled;
    });

    show.forEach((element) => {
        element.classList.add('d-none');
    });

    hide.forEach((element) => {
        element.classList.remove('d-none');
    });

    // Deep clone
    plan = JSON.parse(JSON.stringify(originalPlan));
    dates = getDates(new Date(plan.startDate), new Date(plan.endDate));
    loadPlan(plan, false);
}

/**
 * Updates all dates in the page when user changes starting date
 * @param  {HTMLElement} element Date input that had the change
 */
function updateDates(element) {
    var startDate = new Date(element.value);
    plan.endDate = new Date(plan.endDate).addDays(daysBetween(plan.startDate, startDate, false));
    plan.startDate = startDate;
    dates = getDates(plan.startDate, plan.endDate);

    document.querySelector('#end-date').value = getFormattedDate(plan.endDate, true);
    renderPlan(plan, currentDay);
    editMode(document.querySelector('#planning'));
}

/**
 * Opens insert place modal. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function openInsertPlace(button) {
    var index = parseInt(button.closest('.item').getAttribute('routeIndex'));
    document.querySelector('#searchModal').setAttribute('insertIndex', index);
    document.querySelector('#searchItems').classList.add('d-none');
    document.querySelector('#suggestions').classList.remove('d-none');
    searchMode = 'suggestions';
}

/**
 * Searches a place given a query.
 * @param  {HTMLElement} button Button that triggered the action
 */
async function search(button) {
    setLoadButton(button);
    const modal = button.closest('.modal');
    const query = modal.querySelector('#inputSearch').value;
    modal.querySelector('.alert').classList.add('d-none');
    document.querySelector('#suggestions').classList.add('d-none');

    try {
        var res = (await get(ENDPOINTS.placesSearch + '/' + query)).result;
        searchMode = 'search';
        searchPlaces = res;
        renderInsertPlaces(res, document.querySelector('#searchItemsList'));
        document.querySelector('#searchItems').classList.remove('d-none');
        setDoneButton(button);
        yall();
    } catch (err) {
        unsetLoadButton(button);
        throwError(err);
    }
}

/**
 * Given a place list and a container, renders the places into the (search) container
 * @param  {Array<object>}  places  Places array
 * @param  {HTMLElement}  container Parent container
 * @param  {Boolean} alert     (default: true) If true, shows or hides the 'No results' alert
 */
function renderInsertPlaces(places, container, alert = true) {
    container.innerHTML = '';

    if (alert) {
        if (!places || places.length == 0) {
            container.parentElement.querySelector('.alert').classList.remove('d-none');
        } else {
            container.parentElement.querySelector('.alert').classList.add('d-none');
        }
    }

    for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const card = getTemplate('templateSearchCard');
        card.querySelector('.card').setAttribute('id', place.id);

        if (place.images > 0) {
            card.querySelector('img').setAttribute("data-src", '/assets/places/' + place.id + '/0.jpg');
            card.querySelector('img').setAttribute("alt", `Imagen de ${place.name}`);
        } else {
            card.querySelector('img').setAttribute("data-src", '/assets/default_image.png');
            card.querySelector('img').setAttribute("alt", `Imagen de ${place.name}`);
        }

        card.querySelector('.title').innerHTML = place.name;
        card.querySelector('.description').innerHTML = place.description;

        card.querySelector('.insert-button').addEventListener('click', (e) => {
            insertPlace(e.target.closest('.btn'));
        });

        if (place.wikipedia) {
            card.querySelector('.wikipedia').href = 'https://wikipedia.org/wiki/' + place.wikipedia;
        } else {
            card.querySelector('.wikipedia').remove();
        }

        if (place.placeUrl) {
            card.querySelector('.url').href = place.placeUrl;
        } else {
            card.querySelector('.url').remove();
        }

        container.appendChild(card);
    }
}

/**
 * Inserts a place into the plan. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function insertPlace(button) {
    var index = parseInt(button.closest('#searchModal').getAttribute('insertIndex'));
    var id = parseInt(button.closest('.search-card').getAttribute('id'));
    var place;
    if (searchMode == 'search') {
        place = getElementByKey(searchPlaces, 'id', id);
        umami.trackEvent('Insert searched place', 'click');
    } else if (searchMode == 'suggestions'){
        place = getElementByKey(suggestionPlaces, 'id', id);
        umami.trackEvent('Insert suggested place', 'click');
    }
    plan.days[currentDay].route.splice(index + 1, 0, {
        id: -1,
        place: {
            address: place.address,
            city: place.city,
            country: place.country,
            facebook: place.facebook,
            gmapsUrl: place.gmapsUrl,
            id: place.id,
            images: place.images,
            instagram: place.instagram,
            phone: place.phone,
            placeUrl: place.placeUrl,
            postalCode: place.postalCode,
            state: place.state,
            twitter: place.twitter,
            wikipedia: place.wikipedia,
            categories: place.categories,
            categoriesId: place.categoriesId,
        },
        name: place.name,
        description: place.description,
        notes: '',
        startTime: null,
        endTime: null,
        timeSpent: place.timeSpent,
        travelNext: null,
        type: 1,
        lat: place.lat,
        lon: place.lon,
    });
    document.querySelector('#searchModal').setAttribute('insertIndex', -1);
    searchPlaces = [];
    renderPlan(plan, currentDay);
    editMode(document.querySelector('#planning'));
}

/**
 * Inserts an item into the plan. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function insertItem(type, index) {
    var nameDescription = getNameDescription({ type: type });
    plan.days[currentDay].route.splice(index + 1, 0, {
        id: -1,
        place: null,
        name: nameDescription.name,
        description: nameDescription.description,
        notes: '',
        startTime: null,
        endTime: null,
        timeSpent: 0,
        travelNext: null,
        type: type,
        lat: null,
        lon: null,
    });
    renderPlan(plan, currentDay);
    editMode(document.querySelector('#planning'));
}

/**
 * Inserts a custom place into the plan. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function insertCustom(button) {
    var index = parseInt(button.closest('.item').getAttribute('routeIndex'));
    insertItem(5, index);
}

/**
 * Inserts a wait into the plan. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function insertWait(button) {
    var index = parseInt(button.closest('.item').getAttribute('routeIndex'));
    insertItem(3, index);
}

/**
 * Inserts a rest into the plan. Fetches index from button's parents
 * @param  {HTMLElement} button Button that triggered the action
 */
function insertRest(button) {
    var index = parseInt(button.closest('.item').getAttribute('routeIndex'));
    insertItem(4, index);
}

/**
 * Removes an item from the plan
 * @param  {HTMLElement} button Button that triggered the action
 */
function removeItem(button) {
    var index = parseInt(button.closest('.item').getAttribute('routeIndex'));
    plan.days[currentDay].route.splice(index, 1);
    renderPlan(plan, currentDay);
    editMode(document.querySelector('#planning'));
}

/**
 * Updates an item's notes. Fetches index from button's parents
 * @param  {HTMLElement} textarea Text area that had the change
 */
function updateNotes(textarea) {
    var index = parseInt(textarea.closest('.item').getAttribute('routeIndex'));
    plan.days[currentDay].route[index].notes = textarea.value;
}

/**
 * Updates the time an user spends visiting an item. Fetches index from button's parents
 * @param  {HTMLElement} input Input that had the change
 */
function updateCustomTime(input) {
    var index = parseInt(input.closest('.item').getAttribute('routeIndex'));
    plan.days[currentDay].route[index].timeSpent = parseInt(input.value);
}

/**
 * Check if time spent inputs are valid
 */
function checkTimes() {
    var timeInputs = document.querySelectorAll('input[type="number"].time');
    var unset;
    for (var i = 0; i < timeInputs.length; i++) {
        if (timeInputs[i].value < 15 || timeInputs[i].value % 1 != 0) {
            timeInputs[i].classList.add('border-danger');
            if (!unset) unset = timeInputs[i];
        } else {
            timeInputs[i].classList.remove('border-danger');
        }
    }
    if (unset) {
        scrollToMiddle(unset);
        return false;
    }

    return true;
}

/**
 * Saves a plan, sending data to the server
 * @param  {HTMLElement} button Button that triggered the action
 */
function savePlan(button) {
    if (!checkTimes()) return;

    setLoadButton(button);
    var request = {
        plan: {
            name: document.querySelector('#name').value,
            description: document.querySelector('#description').value,
            id: id,
            startDate: new Date(document.querySelector('#start-date').value),
        },
        items: [],
    };

    for (var i = 0; i < dates.length; i++) {
        var route = plan.days[i].route;
        for (var j = 0; j < route.length; j++) {
            if (route[j].type == 2 && j != 0) {
                continue;
            }
            request.items.push({
                order: j,
                day: i,
                timeSpent: route[j].timeSpent,
                type: route[j].type,
                notes: route[j].notes,
                PlaceId: route[j].place ? route[j].place.id : null,
            });
        }
    }

    put(ENDPOINTS.plannerUpdate, request)
        .then((res) => {
            window.location.reload();
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
}

/**
 * Load random suggestions
 * @param {Array<Place>} places Places to render
 */
async function getRandomSuggestions(places) {
    var ignores = [];
    for (var i = 0; i < dates.length; i++) {
        var route = plan.days[i].route;
        for (var j = 0; j < route.length; j++) {
            if (route[j].type != 1) {
                continue;
            }
            ignores.push(route[j].place.id);
        }
    }

    try {
        const rand = (await post(ENDPOINTS.recommendationsRandom, { ignores: ignores, max: 3 })).result;
        suggestionPlaces = rand;
        renderInsertPlaces(rand, document.querySelector('#suggestionsList'), false);
        yall();
    } catch (err) {
        throwError(err);
    }
}

async function main() {
    if (!id) {
        throwError('ID not set');
        return;
    }

    loader = new bootstrap.Modal(document.querySelector('#loader'), {
        backdrop: 'static',
        keyboard: false,
        focus: true,
    });
    loader.show();

    statusModal = new bootstrap.Modal(document.querySelector('#planStatus'), {
        backdrop: 'static',
        keyboard: false,
        focus: true,
    });

    document.addEventListener('scroll', showHeader);
    document.querySelector('#start-date').disabled = true;
    document.querySelector('#name').disabled = true;
    document.querySelector('#description').disabled = true;

    // Event listeners
    document.querySelector('#deletePlan').addEventListener('click', (e) => {
        deletePlan(e.target.closest('.btn'));
    });
    document.querySelector('#searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        search(e.target.querySelector('#searchButton'));
        return false;
    });
    document.querySelector('#editButtonHeader').addEventListener('click', (e) => {
        edit = true;
        editMode();
    });
    document.querySelector('#editButton').addEventListener('click', (e) => {
        edit = true;
        editMode();
    });
    document.querySelector('#saveButtonHeader').addEventListener('click', (e) => {
        savePlan(e.target.closest('.btn'));
    });
    document.querySelector('#saveButton').addEventListener('click', (e) => {
        savePlan(e.target.closest('.btn'));
    });
    document.querySelector('#cancelButtonHeader').addEventListener('click', (e) => {
        edit = false;
        cancelEdit();
    });
    document.querySelector('#cancelButton').addEventListener('click', (e) => {
        edit = false;
        cancelEdit();
    });
    document.querySelector('#start-date').addEventListener('change', (e) => {
        updateDates(e.target);
    });
    document.querySelector('#name').addEventListener('keyup', (e) => {
        renderHeaderName(e.target.value);
    });
    document.querySelector('#prev').addEventListener('click', (e) => {
        prevDay(e.target.closest('.btn'));
    });
    document.querySelector('#next').addEventListener('click', (e) => {
        nextDay(e.target.closest('.btn'));
    });
    document.querySelector('#refreshSuggestions').addEventListener('click', (e) => {
        e.preventDefault();
        getRandomSuggestions();
    });
    document.querySelector('#inputSearch').addEventListener('keyup', (e) => {
        if (e.target.value.length == 0) {
            document.querySelector('#suggestions').classList.remove('d-none');
            document.querySelector('#searchItems').classList.add('d-none');
            document.querySelector('#searchButton').disabled = true;
            searchMode = 'suggestions';
        } else {
            document.querySelector('#searchButton').disabled = false;
        }
    });

    document.querySelector('#loader').addEventListener('shown.bs.modal', async function (event) {
        post(ENDPOINTS.plannerGet, { id: id })
            .then((res) => {
                loader.hide();
                renderPlanInfo(res.plan);
                if (res.plan.status == 1) {
                    document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.add('d-none');
                    document.querySelector('#planStatus').querySelector('#internalErrorStatus').classList.add('d-none');
                    document.querySelector('#planStatus').querySelector('#planningStatus').classList.remove('d-none');
                    statusModal.show();
                    startIntervalStatus();
                } else if (res.plan.status == 2 || res.plan.status == 3) {
                    document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.remove('d-none');
                    document.querySelector('#planStatus').querySelector('#internalErrorStatus').classList.add('d-none');
                    document.querySelector('#planStatus').querySelector('#planningStatus').classList.add('d-none');
                    statusModal.show();
                } else if (res.plan.status == -1) {
                    document.querySelector('#planStatus').querySelector('#timedoutStatus').classList.add('d-none');
                    document
                        .querySelector('#planStatus')
                        .querySelector('#internalErrorStatus')
                        .classList.remove('d-none');
                    document.querySelector('#planStatus').querySelector('#planningStatus').classList.add('d-none');
                    statusModal.show();
                } else {
                    statusModal.hide();
                    setupMap([res.plan.startLat, res.plan.startLon]);
                    loadPlan(res);
                    getRandomSuggestions();
                    // 2 min.
                    setInterval(getRandomSuggestions, 120000);
                }
            })
            .catch((err) => {
                throwError(err);
                loader.hide();
            });
    });
}

window.onload = () => {
    document.addEventListener("DOMContentLoaded", yall);
    main();
};
