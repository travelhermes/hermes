/* jshint esversion: 8 */
const CONFIG = require('./config.json');
const cpus = Math.floor(require('os').cpus().length / 3);
const db = require('./db/models.js');
const recommender = require('./recommender/index.js');
const { ApplicationLogger, LogLevel } = require('./logger/logger.js');
const { MailServer, MailType } = require('./mail/mail.js');
const { Op } = require('sequelize');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function splitArray(array, parts) {
    let result = [];
    for (let i = parts; i > 0; i--) {
        result.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return result;
}

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

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

function getFormattedDate(date, iso = false, separator = ' / ') {
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

async function processUsers(users) {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < users.length; i++) {
            try {
                await recommender.findNeighbors(users[i]);
                await recommender.generateCFRecommendations(users[i]);
                await recommender.generateCBRecommendations(users[i]);
            } catch (err) {
                reject(err);
                return;
            }
            sleep(500);
        }

        resolve();
    });
}

/*
 * Global configs
 */
db.sequelize.options.logging = false;

/*
 * Mail Server
 */
const mailServer = new MailServer(
    {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
    },
    process.env.MAIL_SERVICE
);

function sendEmails() {
    return new Promise(async (resolve) => {
        const count = mailServer.messages.length;
        while (mailServer.messages.length > 0) {
            mailServer.send();
            await sleep(1000);
        }
        resolve(count);
    });
}

// Note: Runs every 24h, at night
async function main() {
    console.log(`Master with PID ${process.pid} is running`);

    const today = new Date();
    //today.setHours(4, 0);
    const tomorrow = new Date(today).addDays(1);

    console.log('Today', today);
    console.log('Tomorrow', tomorrow);

    // Clean logs older than two months
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning old logs`);
    try {
        let count = 0;
        var logs = await db.ApplicationLog.findAll({
            where: {
                createdAt: {
                    [Op.lt]: new Date(today).addDays(-62),
                },
            },
        });
        for (let i = 0; i < logs.length; i++) {
            logs[i].destroy();
            count++;
        }
        logs = await db.AccessLog.findAll({
            where: {
                createdAt: {
                    [Op.lt]: new Date(today).addDays(-62),
                },
            },
        });
        for (let i = 0; i < logs.length; i++) {
            logs[i].destroy();
            count++;
        }
        ApplicationLogger.logBase(LogLevel.INFO, 0, null, null, 'cronjob/logs', null, 'Cleaned ' + count + ' logs');
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/logs',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    // Clean old sessions
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning old sessions`);
    try {
        let count = 0;
        const sessions = await db.Session.findAll();
        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i].maxAge < (new Date() - sessions[i].createdAt) / 1000) {
                sessions[i].destroy();
                count++;
            }
            if (sessions[i].deletedAt != null && sessions[i].deletedAt < new Date(today).addDays(-15)) {
                sessions[i].destroy({ force: true });
                count++;
            }
        }
        ApplicationLogger.logBase(
            LogLevel.INFO,
            0,
            null,
            null,
            'cronjob/sessions',
            null,
            'Cleaned ' + count + ' sessions'
        );
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/sessions',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    // Clean old, deleted plans
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning old, deleted plans`);
    try {
        let count = 0;
        const plans = await db.Plan.findAll();
        for (let i = 0; i < plans.length; i++) {
            if (plans[i].deletedAt != null && plans[i].deletedAt < new Date(today).addDays(-62)) {
                plans[i].destroy({ force: true });
                count++;
            }
        }
        ApplicationLogger.logBase(
            LogLevel.INFO,
            0,
            null,
            null,
            'cronjob/plans',
            null,
            'Cleaned ' + count + ' plans'
        );
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/plans',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    // Clean deleted user accounts
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning deleted accounts`);
    try {
        let count = 0;
        const users = await db.User.findAll();
        for (let i = 0; i < users.length; i++) {
            // 5 days
            if (users[i].deletedAt != null && users[i].deletedAt < new Date(today).addDays(-5)) {
                db.User.destroy({
                    where: {
                        id: users[i].id,
                    },
                    force: true,
                });
                count++;
            }
        }
        ApplicationLogger.logBase(LogLevel.INFO, 0, null, null, 'cronjob/user', null, 'Deleted ' + count + ' users');
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/user',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    // Send reminder emails
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Creating reminder emails`);
    try {
        let countPlans = 0;
        let countRatings = 0;
        const plans = await db.Plan.findAll({
            where: {
                status: 0,
            },
            include: [
                {
                    model: db.User,
                },
            ],
        });
        for (let i = 0; i < plans.length; i++) {
            // Send plan reminder emails
            if (plans[i].startDate.toDateString() == tomorrow.toDateString()) {
                if (!plans[i].User.notificationsPlans) {
                    continue;
                }
                mailServer.add(plans[i].User.email, MailType.startPlan, {
                    name: plans[i].User.name,
                    planName: plans[i].name,
                    planDescription: plans[i].description,
                    length: daysBetween(plans[i].startDate, plans[i].endDate) + 1,
                    startDate: getFormattedDate(plans[i].startDate, false, '/'),
                    endDate: getFormattedDate(plans[i].endDate, false, '/'),
                    id: plans[i].id,
                }, plans[i].User.lang);
                countPlans++;
            }
            // Send rating reminder emails
            else if (plans[i].startDate.addDays(1) <= today && today < plans[i].endDate.addDays(2)) {
                if (!plans[i].User.notificationsRatings) {
                    continue;
                }
                mailServer.add(plans[i].User.email, MailType.rateVisited, {
                    name: plans[i].User.name,
                }, plans[i].User.lang);
                countRatings++;
            }
        }
        ApplicationLogger.logBase(
            LogLevel.INFO,
            0,
            null,
            null,
            'cronjob/reminders',
            null,
            'Added ' + countPlans + ' plan reminder emails and ' + countRatings + ' rating reminder emails'
        );
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/reminders',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    sendEmails()
        .then((count) => {
            ApplicationLogger.logBase(
                LogLevel.INFO,
                0,
                null,
                null,
                'cronjob/emails',
                null,
                'Sent ' + count + ' emails'
            );
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                0,
                null,
                null,
                'cronjob/emails',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });

    // Update active plans
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Finishing active plans`);
    try {
        let count = 0;
        const plans = await db.Plan.findAll({
            where: {
                status: 0,
            },
            include: [
                {
                    model: db.User,
                },
                {
                    model: db.PlanItem,
                    include: [
                        {
                            model: db.Place,
                            include: [
                                {
                                    model: db.Category,
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        // Update every plan
        for (var i = 0; i < plans.length; i++) {
            if (plans[i].endDate.addDays(1) <= today) {
                plans[i].status = 4;
                await plans[i].save();

                // Traverse every plan item
                for (var j = 0; j < plans[i].PlanItems.length; j++) {
                    const place = plans[i].PlanItems[j].Place;
                    if (!place) {
                        continue;
                    }
                    // Finding all corresponding userViews and incrementing them
                    (
                        await db.UserView.findAll({
                            where: {
                                UserId: plans[i].User.id,
                                CategoryId: {
                                    [Op.in]: place.Categories.map((category) => {
                                        return category.id;
                                    }),
                                },
                            },
                        })
                    ).forEach(async (userView) => {
                        // Increment each view by one
                        userView.views += 1;
                        plans[i].User.views += 1;
                        await userView.save();
                    });
                }
                await plans[i].User.save();

                count++;
            }
        }
        ApplicationLogger.logBase(LogLevel.INFO, 0, null, null, 'cronjob/plans', null, 'Updated ' + count + ' plans');
    } catch (err) {
        ApplicationLogger.logBase(
            LogLevel.FATAL,
            0,
            null,
            null,
            'cronjob/plans',
            null,
            'Errored @ ' + new Date() + ': ' + err
        );
    }

    // Find neighbors again and regenerate recommendations
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Finding users that need new neighbors`);
    var users = (await db.User.findAll({})).filter((user) => {
        if (today - user.lastNeighbor > 3600 * 24 * 1000 - 10) {
            return user;
        }
    });

    // Split users in n = cpus subarrays and process in parallel
    const countUsers = users.length;
    const parts = splitArray(users, cpus);
    const promises = [];
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
            promises.push(processUsers(parts[i]));
        }
    }

    console.log(`[${new Date().toLocaleString()}] (cron.js) - Finding neighbors and creating recommendations`);
    Promise.all(promises)
        .then(() => {
            ApplicationLogger.logBase(
                LogLevel.INFO,
                0,
                null,
                null,
                'cronjob/recommender',
                null,
                'Created recommendations for ' + countUsers + ' users'
            );
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                0,
                null,
                null,
                'cronjob/recommender',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });
}

main();
