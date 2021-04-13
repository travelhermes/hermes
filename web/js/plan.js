/* jshint esversion: 8 */
var loader;
var statusModal;
var statusInterval;
const urlParams = new URLSearchParams(window.location.search);
const id = parseInt(urlParams.get('id'));

var plan;
var originalPlan;
var edit = false;

var dates;
var currentDay = 0;

var searchPlaces = [];

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
}

/**
 * Return an HTML object to render a place into the page body
 * @param  {object} item Place to render
 * @return {HTMLElement}      Item element to render
 */
function renderPlace(item) {
    const card = getTemplate('templateCardPlace');

    card.querySelector('.time-start').innerHTML = item.startTime;
    card.querySelector('.title').innerHTML = item.placeName;
    card.querySelector('.time').value = item.timeSpent;
    card.querySelector('.description').innerHTML = item.placeDescription;
    card.querySelector('.time-end').innerHTML = item.endTime;
    card.querySelector('.maps').href = item.gmapsUrl;
    card.querySelector('.notes').value = item.description;
    if (item.placeWikipedia) {
        card.querySelector('.wiki').href = 'https://es.wikipedia.org/wiki/' + item.placeWikipedia;
    } else {
        card.querySelector('.wiki').remove();
    }
    if (item.placeUrl) {
        card.querySelector('.link').href = item.placeUrl;
    } else {
        card.querySelector('.link').remove();
    }
    if (item.placeImages > 0) {
        card.querySelector('.img').style.background = "url('/assets/places/" + item.placeId + "/0.jpg')";
        card.querySelector('.img').style.backgroundRepeat = 'no-repeat';
        card.querySelector('.img').style.backgroundSize = 'cover';
        card.querySelector('.img').style.backgroundPosition = 'center';
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
    card.querySelector('.notes').value = item.description;
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
    card.querySelector('.notes').value = item.description;
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
            document.querySelector('#planning').appendChild(travel);
        }
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
                statusModal.hide();
                clearInterval(statusInterval);
                loadPlan(res);
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
    var placeName;
    var placeDescription;

    switch (item.type) {
        case 1:
            placeName = item.placeName;
            placeDescription = item.placeDescription;
            break;
        case 2:
            placeName = 'Inicio';
            placeDescription = 'Este es tu punto de inicio.';
            break;
        case 3:
            placeName = 'Esperar';
            placeDescription =
                'El siguiente lugar a visitar aún no ha abierto, por lo que tendrás que esperar hasta que abra.';
            break;
        case 4:
            placeName = 'Descanso';
            placeDescription = 'Este es el período de descanso que has definido al crear el plan';
            break;
        case 5:
            placeName = 'Personalizado';
            placeDescription = '';
            break;
        default:
            placeName = 'Sin asignar';
            placeDescription = '';
            break;
    }

    return {
        name: placeName,
        description: placeDescription,
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
                        placeName: 'Inicio',
                        placeDescription: 'Este es tu punto de inicio.',
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

    if (dates[dates.length - 1].addDays(1) < new Date()) {
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

    try {
        var res = (await get(ENDPOINTS.placesSearch + '/' + query)).result;
        searchPlaces = res;
        renderInsertPlaces(res, document.querySelector('#searchItems'), false, false);
        setDoneButton(button);
    } catch (err) {
        unsetLoadButton(button);
        throwError(err);
    }
}

/**
 * Given a place list and a container, renders the places into the container
 * @param  {Array<object>}  places  Places array
 * @param  {HTMLElement}  container Parent container
 * @param  {Boolean} remove    (default: true) If true, enables remove button
 * @param  {Boolean} split     (default: true) If true, renders in columns
 */
function renderInsertPlaces(places, container) {
    container.innerHTML = '';

    if (!places || places.length == 0) {
        container.parentElement.querySelector('.alert').classList.remove('d-none');
    } else {
        container.parentElement.querySelector('.alert').classList.add('d-none');
    }

    for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const card = getTemplate('templateSearchCard');
        card.querySelector('.card').setAttribute('id', place.id);

        if (place.images > 0) {
            card.querySelector('.img').style.background = "url('/assets/places/" + place.id + "/0.jpg')";
            card.querySelector('.img').style.backgroundRepeat = 'no-repeat';
            card.querySelector('.img').style.backgroundSize = 'cover';
            card.querySelector('.img').style.backgroundPosition = 'center';
        }

        card.querySelector('.title').innerHTML = place.name;
        card.querySelector('.description').innerHTML = place.description;

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
    var place = getElementByKey(searchPlaces, 'id', id);
    plan.days[currentDay].route.splice(index + 1, 0, {
        id: -1,
        placeId: place.id,
        placeName: place.name,
        placeDescription: place.description,
        placeImages: place.images,
        description: '',
        startTime: null,
        endTime: null,
        timeSpent: place.timeSpent,
        travelNext: null,
        type: 1,
        gmapsUrl: place.gmapsUrl,
        placeWikipedia: place.wikipedia,
        placeUrl: place.placeUrl,
    });
    document.querySelector('#searchItems').innerHTML = '';
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
        placeId: null,
        placeName: nameDescription.name,
        placeDescription: nameDescription.description,
        placeImages: 0,
        description: '',
        startTime: null,
        endTime: null,
        timeSpent: 0,
        travelNext: null,
        type: type,
        gmapsUrl: null,
        placeWikipedia: null,
        placeUrl: null,
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
    plan.days[currentDay].route[index].description = textarea.value;
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
 * Saves a plan, sending data to the server
 * @param  {HTMLElement} button Button that triggered the action
 */
function savePlan(button) {
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
            console.log( route[j].timeSpent);
            request.items.push({
                order: j,
                day: i,
                timeSpent: route[j].timeSpent,
                type: route[j].type,
                description: route[j].description,
                PlaceId: route[j].placeId,
            });
        }
    }

    put(ENDPOINTS.plannerUpdate, request)
        .then((res) => {
            window.location.reload(true);
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
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
                    loadPlan(res);
                }
            })
            .catch((err) => {
                throwError(err);
                loader.hide();
            });
    });
}

main();
