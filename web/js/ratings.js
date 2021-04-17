/*jshint esversion: 8 */
var loader;
var modified = false;

/**
 * onMouseOver function to fill stars when they are hovered
 * @param  element Star element
 * @param {Number} index   Index of the element
 */
function fillStar(element, index) {
    const parent = element.parentElement;
    if (parent.getAttribute('rated') == 'true') {
        return;
    }

    const stars = parent.querySelectorAll('.bi');

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (i < index) {
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill');
        } else {
            star.classList.add('bi-star');
            star.classList.remove('bi-star-fill');
        }
    }
}

/**
 * onMouseOut function to unfill stars after they are hovered
 * @param  element Star element
 */
function unfillStars(element) {
    if (element.getAttribute('rated') == 'true') {
        return;
    }

    const stars = element.querySelectorAll('.bi');

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.classList.add('bi-star');
        star.classList.remove('bi-star-fill');
    }
}

/**
 * Set rating after user clicks on a star
 * @param           element Star element
 * @param {Number}  index   Index of the element
 * @param {Boolean} send    (default: true) If true, sends a request to add rating to database.
 */
async function setStars(element, index, send = true) {
    const parent = element.parentElement;
    if (parent.getAttribute('rated') == 'true') {
        return;
    }
    const id = element.closest('.card').getAttribute('id').replace('place-', '');

    try {
        if (send) {
            await post(ENDPOINTS.ratingCreate, { placeId: parseInt(id), rating: index });
        }
        fillStar(element, index);
        parent.classList.remove('active');

        parent.setAttribute('rated', true);
    } catch (err) {
        throwError(err);
    }
}

/**
 * Deletes a rating
 * @param  button Button element
 */
async function del(button) {
    setLoadButton(button);
    const card = button.closest('.card');
    const id = parseInt(card.getAttribute('id'));
    try {
        await post(ENDPOINTS.ratingDelete, { placeId: id });
        const res = await get(ENDPOINTS.ratingsGet, {});
        renderPlaces(res.pending, document.querySelector('#pendingRatings'), false);
        renderPlaces(res.done, document.querySelector('#completedRatings'));
    } catch (err) {
        throwError(err);
        unsetLoadButton(button);
    }
}

/**
 * Given a place list and a container, renders the places into the container
 * @param  {Array<object>}  places  Places array
 * @param  {HTMLElement}  container Parent container
 * @param  {Boolean} remove    (default: true) If true, enables remove button
 * @param  {Boolean} split     (default: true) If true, renders in columns
 */
function renderPlaces(places, container, remove = true, split = true) {
    var cols;
    var col1;
    var col2;
    if (split) {
        cols = container.querySelectorAll('.col');
        col1 = cols[0];
        col2 = cols[1];
        col1.innerHTML = '';
        col2.innerHTML = '';
    } else {
        container.innerHTML = '';
    }

    if (!places || places.length == 0) {
        container.parentElement.querySelector('.alert').classList.remove('d-none');
    } else {
        container.parentElement.querySelector('.alert').classList.add('d-none');
    }

    for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const card = getTemplate('templateCard');
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

        if (!remove) {
            card.querySelector('.btn-group').remove();
        } else {
            card.querySelector('.delete').addEventListener('click', (e) => {
                del(e.target.closest('.btn'));
            });
        }

        card.querySelector('.stars').addEventListener('mouseout', (e) => {
            unfillStars(e.target);
        });
        card.querySelector('.stars')
            .querySelectorAll('.bi-star')
            .forEach((item) => {
                item.addEventListener('click', (e) => {
                    setStars(e.target, parseInt(item.getAttribute('data-index')));
                });
                item.addEventListener('mouseover', (e) => {
                    fillStar(e.target, parseInt(item.getAttribute('data-index')));
                });
                item.addEventListener('mouseout', (e) => {
                    unfillStars(e.target.parentElement);
                });
            });

        if (split) {
            if (i % 2 == 0) {
                col1.appendChild(card);
            } else {
                col2.appendChild(card);
            }
        } else {
            container.appendChild(card);
        }

        if (place.rating) {
            console.log(place);
            setStars(document.getElementById(place.id).querySelector('.bi-star'), place.rating, false);
        }
    }
}

/**
 * Search places by query to find places that can be rated
 * @param  {HTMLElement} button Button that triggered the action
 */
async function search(button) {
    setLoadButton(button);
    const modal = button.closest('.modal');
    const query = modal.querySelector('#inputSearch').value;
    modal.querySelector('.alert').classList.add('d-none');

    try {
        var res = (await get(ENDPOINTS.ratingsSearch + '/' + query)).result;
        renderPlaces(res, document.querySelector('#searchItems'), false, false);
        setDoneButton(button);
    } catch (err) {
        unsetLoadButton(button);
        throwError(err);
    }
}

async function main() {
    loader = new bootstrap.Modal(document.querySelector('#loader'), {
        backdrop: 'static',
        keyboard: false,
        focus: true,
    });
    loader.show();

    document.querySelectorAll('.close').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            window.location.reload();
            // try {
            //     const res = await get(ENDPOINTS.ratingsGet, {});
            //     renderPlaces(res.pending, document.querySelector('#pendingRatings'), false);
            //     renderPlaces(res.done, document.querySelector('#completedRatings'));
            // } catch (err) {
            //     throwError(err);
            // }
        });
    });
    document.querySelector('#searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        search(e.target.querySelector('#btnSubmitSearch'));
        return false;
    });

    document.querySelector('#loader').addEventListener('shown.bs.modal', async function (event) {
        try {
            const res = await get(ENDPOINTS.ratingsGet, {});
            renderPlaces(res.pending, document.querySelector('#pendingRatings'), false);
            renderPlaces(res.done, document.querySelector('#completedRatings'));

            loader.hide();
        } catch (err) {
            throwError(err);
            loader.hide();
        }
    });
}

window.onload = () => {
    main();
};
