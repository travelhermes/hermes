/* jshint esversion: 8 */
var loader;

document.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
    dropdown.addEventListener('click', function (e) {
        e.stopPropagation();
    });
});

/**
 * Saves changed account profile, sending data to the server
 * @param  {HTMLElement} form Account profile form
 */
async function save(form) {
    document.querySelector('#categoriesSelect').classList.remove('text-danger');
    document.querySelector('#categoriesSelect').classList.add('text-dark');
    document.querySelector('#categoriesSelect').innerHTML = 'Selecciona al menos 3 categorías';

    setLoadButton(document.querySelector('#inputSaveProfile'));
    const data = {
        user: {
            name: form.querySelector('#inputName').value,
            surname: form.querySelector('#inputSurname').value,
            email: form.querySelector('#inputEmail').value,
        },
        preferences: [],
    };

    document.querySelectorAll('.dropdown-menu').forEach((dropdown) => {
        dropdown.querySelectorAll('input').forEach((category) => {
            if (category.checked) {
                data.preferences.push(parseInt(category.getAttribute('id').replace('cat-', '')));
            }
        });
    });

    if (data.preferences.length < 3) {
        document.querySelector('#categoriesSelect').classList.remove('text-dark');
        document.querySelector('#categoriesSelect').classList.add('text-danger');
        document.querySelector('#categoriesSelect').innerHTML =
            '<i class="bi bi-exclamation-circle"></i> ' + document.querySelector('#categoriesSelect').innerHTML;

        unsetLoadButton(document.querySelector('#inputSaveProfile'));

        return;
    }

    try {
        await put(ENDPOINTS.accountUpdate, data);
        setDoneButton(document.querySelector('#inputSaveProfile'));
    } catch (err) {
        unsetLoadButton(document.querySelector('#inputSaveProfile'));
        throwError(err);
    }

    return false;
}

/**
 * Validates password inputs
 * @param  {HTMLElement} input Password input
 */
async function validate(input) {
    const form = input.closest('form');
    const password1 = form.querySelector('#inputPassword1');
    const password2 = form.querySelector('#inputPassword2');
    if (password1.value == password2.value) {
        document.querySelector('#inputInvalid').classList.add('d-none');
        document.querySelector('#inputPasswordChange').disabled = false;
    } else {
        document.querySelector('#inputInvalid').classList.remove('d-none');
        document.querySelector('#inputPasswordChange').disabled = true;
    }
}

/**
 * Sends a password change request
 * @param  {HTMLElement} form Passwords form
 */
async function change(form) {
    setLoadButton(document.querySelector('#inputPasswordChange'));
    document.querySelector('#inputInvalid').classList.add('d-none');

    const password = sha256(form.querySelector('#inputPassword1').value);
    try {
        await put(ENDPOINTS.passwordUpdate, { password: password });
        setDoneButton(document.querySelector('#inputPasswordChange'));
    } catch (err) {
        throwError(err);
        unsetLoadButton(document.querySelector('#inputPasswordChange'));
        throwError(err);
    }

    return false;
}

/**
 * Sends a request to close all sessions
 * @param  {HTMLElement} button Button that triggered the action
 */
function closeAllSessions(button) {
    setLoadButton(button);
    get(ENDPOINTS.logoutAll)
        .then(() => {
            setDoneButton(button);
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
}

/**
 * Sends a request to delete the account
 * @param  {HTMLElement} button Button that triggered the action
 */
async function deleteAccount(button) {
    setLoadButton(document.querySelector('#inputDeleteSubmit'));
    document.querySelector('#invalidPassword').classList.add('d-none');

    var modal = button.closest('.modal');
    var password = sha256(modal.querySelector('#inputDeletePassword').value);

    try {
        const res = await post(ENDPOINTS.accountDelete, {
            password: password,
        });
        window.location = '/';
    } catch (err) {
        if (err.status == 400 || err.status == 401) {
            document.querySelector('#invalidPassword').classList.remove('d-none');
        } else {
            throwError(err);
        }
    }

    unsetLoadButton(document.querySelector('#inputDeleteSubmit'));
}

/**
 * Downloads user data from server
 * @param  {HTMLElement} button Button that triggered the action
 */
function downloadData(button) {
    setLoadButton(button);

    get(ENDPOINTS.accountDownload)
        .then((res) => {
            downloadObjectAsJson(res, res.user.email + '_data');
            setDoneButton(button);
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
}

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.json');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function main() {
    loader = new bootstrap.Modal(document.querySelector('#loader'), {
        backdrop: 'static',
        keyboard: false,
        focus: true,
    });
    loader.show();
    document.querySelector('#loader').addEventListener('shown.bs.modal', async function (event) {
        try {
            const res = await get(ENDPOINTS.accountInfo);

            document.querySelector('#inputName').value = res.user.name;
            document.querySelector('#inputSurname').value = res.user.surname;
            document.querySelector('#inputEmail').value = res.user.email;

            res.preferences.forEach((preference) => {
                document.querySelector('#cat-' + preference).checked = true;
            });
            loader.hide();
        } catch (err) {
            throwError(err);
            loader.hide();
        }
    });
}

main();
