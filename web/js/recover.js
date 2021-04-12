/* jshint esversion: 8 */
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
    window.location = '/signin/';
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
        document.querySelector('#inputSubmit').disabled = false;
    } else {
        document.querySelector('#inputInvalid').classList.remove('d-none');
        document.querySelector('#inputSubmit').disabled = true;
    }
}

/**
 * Sends the password and the token to recover/reset the password.
 * Redirects to /signin/ if successful
 * @param  {HTMLElement} form Passwords form
 */
async function recover(form) {
    setLoadButton(document.querySelector('#inputSubmit'));
    document.querySelector('#invalidLink').classList.add('d-none');

    const password = sha256(form.querySelector('#inputPassword1').value);

    try {
        await put(ENDPOINTS.passwordChange, {
            token: token,
            password: password,
        });
        setDoneButton(document.querySelector('#inputSubmit'));

        setTimeout(function () {
            window.location = '/signin/';
        }, 2000);
    } catch (err) {
        unsetLoadButton(document.querySelector('#inputSubmit'));
        if (e.status == 401) {
            document.querySelector('#invalidLink').classList.remove('d-none');
        } else {
            throwError(err);
        }
    }

    return false;
}
