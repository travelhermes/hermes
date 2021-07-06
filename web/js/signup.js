/*jshint esversion: 8 */
document.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
    dropdown.addEventListener('click', function (e) {
        e.stopPropagation();
    });
});

var places = [];
var preferences = [];

/**
 * Loads random places from server
 */
async function loadPlaces() {
    var ignores = places.map((place) => {
        return place.id;
    });

    setLoadButton(document.querySelector('#inputPlaces'));

    try {
        const places = (await post(ENDPOINTS.placesRandom, { ignores: ignores })).places;
        renderPlaces(places, document.querySelector('#sitesRandom'), document.querySelector('#inputPlaces'));
    } catch (err) {
        throwError(err);
        unsetLoadButton(document.querySelector('#inputPlaces'));
    }
}

/**
 * Searches for places that have not been rated already
 */
async function searchPlaces() {
    setLoadButton(document.querySelector('#inputSubmitSearch'));

    const query = document.querySelector('#inputSearch').value;
    try {
        const places = (await get(ENDPOINTS.ratingsSearch + '/' + query)).result;
        renderPlaces(places, document.querySelector('#sitesSearch'), document.querySelector('#inputSubmitSearch'));
        setDoneButton(document.querySelector('#inputSubmitSearch'));
    } catch (err) {
        renderPlaces([], document.querySelector('#sitesSearch'), document.querySelector('#inputSubmitSearch'));
        throwError(err);
        unsetLoadButton(document.querySelector('#inputSubmitSearch'));
    }
}

/**
 * Render places into the container
 * @param  {Array} places    Array of places
 * @param  {HTMLElement} container Container to render into
 * @param  {HTMLElement} button    Button that triggered the action
 */
async function renderPlaces(places, container, button) {
    setLoadButton(button);
    container.innerHTML = '';

    if (places && places.length > 0) {
        places.forEach((place) => {
            const card = getTemplate('templatePlaceCard');
            card.querySelector('.title').innerHTML = place.name;
            card.querySelector('.card').setAttribute('id', 'place-' + place.id);

            card.querySelector('.categories').innerHTML = place.categories.join(', ');

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

            container.appendChild(card);
        });
    } else {
        const card = getTemplate('templatePlaceCard');
        card.querySelector('.title').innerHTML = 'Sin resultados';
        card.querySelector('.card-body').remove();
        card.querySelector('.wikipedia').remove();
        card.querySelector('.url').remove();
        container.appendChild(card);
    }

    setDoneButton(button);
}

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
async function setStars(element, index) {
    const parent = element.parentElement;
    if (parent.getAttribute('rated') == 'true') {
        return;
    }

    parent.parentElement.querySelector('.spinner-border').classList.remove('d-none');
    const id = element.closest('.card').getAttribute('id').replace('place-', '');
    try {
        await post(ENDPOINTS.ratingCreate, { placeId: parseInt(id), rating: index });
        fillStar(element, index);
        parent.classList.remove('active');

        parent.setAttribute('rated', true);
        places.push({
            id: parseInt(id),
            rating: index,
        });

        parent.parentElement.querySelector('.spinner-border').classList.add('d-none');
        try {
            umami.trackEvent('Rated ' + index + ' stars on signup', 'click');
        } catch (e) {
            console.log("Umami not available");
        }
    } catch (err) {
        throwError(err);
        parent.parentElement.querySelector('.spinner-border').classList.add('d-none');
    }
}

function continueFirstStep(form) {
    form.querySelector('#invalidCaptcha').classList.add('d-none');

    const hCaptchaReponse = form
        .querySelector('#hCaptcha')
        .querySelector('iframe')
        .getAttribute('data-hcaptcha-response');
    if (hCaptchaReponse == null || hCaptchaReponse.length == 0) {
        form.querySelector('#invalidCaptcha').classList.remove('d-none');
        return;
    } else {
        form.querySelector('#invalidCaptcha').classList.add('d-none');
    }

    form.classList.add('d-none');
    document.querySelector('#step2').classList.remove('d-none');

    return false;
}

function backSecondStep(button) {
    button.closest('form').classList.add('d-none');
    document.querySelector('#step1').classList.remove('d-none');
}

/**
 * Sends a request to create a new account
 */
function signup() {
    // Reset categories message
    document.querySelector('#categoriesSelect').classList.remove('text-danger');
    document.querySelector('#categoriesSelect').classList.add('text-white');
    document.querySelector('#categoriesSelect').innerHTML = document
        .querySelector('#categoriesSelect')
        .getAttribute('original-data');

    preferences = [];
    document.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
        dropdown.querySelectorAll('input').forEach((category) => {
            if (category.checked) {
                preferences.push(parseInt(category.getAttribute('id').replace('cat-', '')));
            }
        });
    });

    if (preferences.length < 3) {
        document.querySelector('#categoriesSelect').classList.remove('text-white');
        document.querySelector('#categoriesSelect').classList.add('text-danger');
        document.querySelector('#categoriesSelect').innerHTML =
            '<i class="bi bi-exclamation-circle"></i> ' + document.querySelector('#categoriesSelect').innerHTML;

        return false;
    }

    setLoadButton(document.querySelector('#inputSubmitStep2'));

    var data = {
        name: document.querySelector('#inputName').value,
        surname: document.querySelector('#inputSurname').value,
        email: document.querySelector('#inputEmail').value,
        password: sha256(document.querySelector('#inputPassword').value),
        preferences: preferences,
        hCaptcha: document
            .querySelector('#step1')
            .querySelector('#hCaptcha')
            .querySelector('iframe')
            .getAttribute('data-hcaptcha-response'),
    };

    post(ENDPOINTS.signup, data)
        .then(() => {
            document.querySelector('#invalidEmail').classList.add('d-none');
            document.querySelector('#cooldown').classList.add('d-none');

            document.querySelector('#step2').classList.add('d-none');
            document.querySelector('#step3').classList.remove('d-none');
        })
        .catch((err) => {
            unsetLoadButton(document.querySelector('#inputSubmitStep2'));
            if (err.status == 409) {
                document.querySelector('#invalidEmail').classList.remove('d-none');
                window.location = '#invalidEmail';
            } else if (err.status == 429) {
                document.querySelector('#cooldown').classList.remove('d-none');
                window.location = '#cooldown';
            } else {
                throwError(err);
            }
        });

    return false;
}

/**
 * Finishes the signup proccess. If called when search input is active, search instead
 */
function continueThirdStep() {
    // Check if search is focused
    if (document.activeElement === document.querySelector('#inputSearch')) {
        searchPlaces();

        return false;
    }

    setLoadButton(document.querySelector('#inputSubmitStep3'));
    get(ENDPOINTS.recommendationsRequest)
        .then(() => {
            window.location = '/dashboard/';
            //window.location = "/ratings/";
        })
        .catch((err) => {
            unsetLoadButton(document.querySelector('#inputSubmitStep3'));
            throwError(err);
        });

    return false;
}

async function main() {
    // Event listeners
    document.querySelector('#step1').addEventListener('submit', (e) => {
        e.preventDefault();
        continueFirstStep(e.target);
        return false;
    });
    document.querySelector('#step2').addEventListener('submit', (e) => {
        e.preventDefault();
        signup();
        return false;
    });
    document.querySelector('#step3').addEventListener('submit', (e) => {
        e.preventDefault();
        continueThirdStep();
        return false;
    });
    document.querySelector('#backButton1').addEventListener('click', (e) => {
        backSecondStep(e.target);
    });
    document.querySelectorAll('.dropdown-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            toggleCheckbox(e.target.closest('.dropdown-item'));
        });
    });
    document.querySelector('#inputSubmitSearch').addEventListener('click', (e) => {
        searchPlaces();
    });
    document.querySelector('#inputPlaces').addEventListener('click', (e) => {
        loadPlaces();
    });

    document.querySelector('#inputEmail').addEventListener('change', (e) => {
        document.querySelector('#invalidEmail').classList.add('d-none');
    });

    loadPlaces();
}

window.onload = () => {
    main();
};
