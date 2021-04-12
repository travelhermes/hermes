/* jshint esversion: 8 */

var loader;
var plans;
var statusInterval = null;

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
 * Render a plan list into the container
 * @param  {Array<Plan>} plansArray Array of plans
 * @param  {HTMLElement} container  Container to render plans into
 */
function renderPlans(plansArray, container) {
    if (plansArray.length == 0) {
        return;
    }
    container.innerHTML = '';
    for (var i = 0; i < plansArray.length; i++) {
        const card = getTemplate('templateCard');
        const plan = plansArray[i];
        const days = daysBetween(new Date(plan.startDate), new Date(plan.endDate)) + 1;
        const startDate = new Date(plan.startDate);
        const endDate = new Date(plan.endDate);

        card.querySelector('div').setAttribute('id', 'plan' + plan.id);
        card.querySelector('.card-title').innerHTML = plan.name;
        card.querySelector('.days').innerHTML = days + (days == 1 ? ' día' : ' días');
        card.querySelector('.state').appendChild(resolveState(plan.status));
        card.querySelector('.start-date').innerHTML = getFormattedDate(startDate);
        card.querySelector('.end-date').innerHTML = getFormattedDate(endDate);

        card.querySelector('.route').href = '/plans/plan/?id=' + plan.id;
        card.querySelector('.delete').addEventListener('click', function (event) {
            let id = parseInt(event.target.closest('.card').getAttribute('id').replace('plan', ''));
            let plan = getElementByKey(plans.active, 'id', id) || getElementByKey(plans.past, 'id', id);

            document.querySelector('#planDeleteName').innerHTML = plan.name;
            document.querySelector('#deleteConfirm').setAttribute('planId', id);
        });

        if (plan.description.length > 0) {
            card.querySelector('.description').innerHTML = plan.description;
        } else {
            card.querySelector('.description').remove();
        }

        container.appendChild(card);
    }
}

/**
 * Create an interval to check every 5 seconds if the plan status changed
 */
function startIntervalStatus() {
    statusInterval = setInterval(async function () {
        for (let i = 0; i < plans.active.length; i++) {
            if (plans.active[i].status != 1) {
                continue;
            }
            try {
                let status = (await get(ENDPOINTS.plannerStatus + '/' + plans.active[i].id)).status;
                plans.active[i].status = status;
                document.querySelector('#plan' + plans.active[i].id).querySelector('.state').innerHTML = '';
                document
                    .querySelector('#plan' + plans.active[i].id)
                    .querySelector('.state')
                    .appendChild(resolveState(status));
            } catch (err) {
                throwError(err);
                break;
            }
        }
        for (let i = 0; i < plans.past.length; i++) {
            if (plans.active[i].status != 1) {
                continue;
            }
            try {
                let status = (await get(ENDPOINTS.plannerStatus + '/' + plans.past[i].id)).status;
                plans.past[i].status = status;
                document.querySelector('#plan' + plans.past[i].id).querySelector('.state').innerHTML = '';
                document
                    .querySelector('#plan' + plans.past[i].id)
                    .querySelector('.state')
                    .appendChild(resolveState(status));
            } catch (err) {
                throwError(err);
                break;
            }
        }
    }, 5000);
}

/**
 * Deletes a plan
 * @param  {HTMLElement} button Button that perfomed the action
 */
function deletePlan(button) {
    setLoadButton(button);
    var id = parseInt(button.closest('.modal').getAttribute('planId'));
    post(ENDPOINTS.plannerDelete, { id: id })
        .then((res) => {
            button.closest('.modal').querySelector('.btn-close').click();
            unsetLoadButton(button);
            main();
        })
        .catch((err) => {
            throwError(err);
            unsetLoadButton(button);
        });
}

async function main() {
    loader = new bootstrap.Modal(document.querySelector('#loader'), {
        backdrop: 'static',
        keyboard: false,
        focus: true,
    });
    loader.show();
    document.querySelector('#loader').addEventListener('shown.bs.modal', async function (event) {
        get(ENDPOINTS.plannerList)
            .then((res) => {
                plans = res;
                renderPlans(res.active, document.querySelector('#activePlans'));
                renderPlans(res.past, document.querySelector('#pastPlans'));
                loader.hide();
                if (!statusInterval) {
                    startIntervalStatus();
                }
            })
            .catch((err) => {
                throwError(err);
                loader.hide();
            });
    });
}

main();
