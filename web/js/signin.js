/* jshint esversion: 8 */
const urlParams = new URLSearchParams(window.location.search);
const redirect = urlParams.get('redirect');

const recoverModal = new bootstrap.Modal(document.querySelector('#recoverModal'));

/**
 * Sends Sign In request to server. Also performs validations and redirections
 * @param  {HTMLElement} form Sign In form
 */
function signin(form) {
    setLoadButton(document.querySelector('#inputSubmit'));
    document.querySelector('#invalidCredentials').classList.add('d-none');
    document.querySelector('#cooldown').classList.add('d-none');
    post('/api/auth/signin', {
        email: form.querySelector('#inputEmail').value,
        password: sha256(form.querySelector('#inputPassword').value),
        remember: form.querySelector('#inputRemember').checked,
    })
        .then(() => {
            console.log('Ok');
            if (redirect != null) {
                console.log('Redirecting...');
                window.location = atob(redirect);
            } else {
                window.location = '/dashboard/';
                //window.location = "/ratings/";
            }
        })
        .catch((err) => {
            unsetLoadButton(document.querySelector('#inputSubmit'));
            if (err.status == 401) {
                document.querySelector('#cooldown').classList.add('d-none');
                document.querySelector('#invalidCredentials').classList.remove('d-none');
            } else if (err.status == 429) {
                document.querySelector('#invalidCredentials').classList.add('d-none');
                document.querySelector('#cooldown').classList.remove('d-none');
            } else {
                throwError(err);
            }
        });

    return false;
}

/**
 * Sends password recovery/reset request.
 * @param  {HTMLElement} form Recovery form
 */
function recover(form) {
    setLoadButton(document.querySelector('#inputSubmitRecover'));
    var email = form.querySelector('#inputEmailRecover').value;

    post(ENDPOINTS.passwordRequest, { email: email })
        .then((res) => {
            setDoneButton(document.querySelector('#inputSubmitRecover'));
            document.querySelector('#cooldownReset').classList.add('d-none');
            //recoverModal.hide();
        })
        .catch((err) => {
            unsetLoadButton(document.querySelector('#inputSubmitRecover'));
            if (err.status == 429) {
                document.querySelector('#cooldownReset').classList.remove('d-none');
            } else {
                throwError(err);
                //recoverModal.hide();
            }
        });

    return false;
}

function main() {
    document.querySelector('#recoverForm').addEventListener('submit', (e) => {
        e.preventDefault();
        recover(e.target);
        return false;
    });
    document.querySelector('#signinForm').addEventListener('submit', (e) => {
        e.preventDefault();
        signin(e.target);
        return false;
    });
}

window.onload = () => {
    main();
};
