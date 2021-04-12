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
    CONFIG.mail.host,
    CONFIG.mail.port,
    {
        user: CONFIG.mail.user,
        pass: CONFIG.mail.password,
    },
    CONFIG.mail.service,
    CONFIG.mail.secure,
    {
        rejectUnauthorized: !CONFIG.mail.selfSigned,
    }
);

// Note: Runs every 24h, at night
async function main() {
    console.log(`Master with PID ${process.pid} is running`);
    const now24 = new Date();
    now24.setHours(now24.getHours() - 24);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Today', today);
    console.log('Tomorrow', tomorrow);

    // Clean old sessions
    db.Session.findAll()
        .then((res) => {
            console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning old sessions`);
            for (var i = 0; i < res.length; i++) {
                if (res[i].maxAge < (new Date() - res[i].createdAt) / 1000) {
                    res[i].destroy();
                }
            }
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/sessions',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });

    // Clean deleted user accounts
    db.User.findAll()
        .then((res) => {
            console.log(`[${new Date().toLocaleString()}] (cron.js) - Cleaning deleted accounts`);
            for (var i = 0; i < res.length; i++) {
                // 15 days
                if (1296000 < (new Date() - res[i].deletedAt) / 1000) {
                    db.User.destroy({
                        where: {
                            id: res[i].id,
                        },
                        force: true,
                    });
                }
            }
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/user',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });

    // Update active plans
    db.Plan.findAll({
        where: {
            status: 0,
            endDate: {
                [Op.lt]: new Date(),
            },
        },
    })
        .then((res) => {
            console.log(`[${new Date().toLocaleString()}] (cron.js) - Finishing active plans`);
            for (var i = 0; i < res.length; i++) {
                res[i].status = 4;
                res[i].save();
            }
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/plans',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });

    // Send plan reminder emails
    db.Plan.findAll({
        where: {
            status: 0,
        },
        include: [
            {
                model: db.User,
            },
        ],
    })
        .then((res) => {
            console.log(`[${new Date().toLocaleString()}] (cron.js) - Sending plan reminder emails`);
            for (var i = 0; i < res.length; i++) {
                if (res[i].startDate.toDateString() != tomorrow.toDateString()) {
                    continue;
                }
                mailServer.add(res[i].User.email, MailType.startPlan, {
                    name: res[i].User.name,
                    planName: res[i].name,
                    planDescription: res[i].description,
                    length: daysBetween(res[i].startDate, res[i].endDate) + 1,
                    startDate: getFormattedDate(res[i].startDate, false, '/'),
                    endDate: getFormattedDate(res[i].endDate, false, '/'),
                    id: res[i].id,
                });
                mailServer.send();
                console.log(`[${new Date().toLocaleString()}] (cron.js) - Sent plan reminder email ${i}/${res.length}`);
                sleep(1000);
            }
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/reminder/plan',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });

    // Send plan reminder emails
    db.Plan.findAll({
        where: {
            startDate: {
                [Op.gt]: today,
                [Op.lte]: today,
            },
        },
        include: [
            {
                model: db.User,
            },
        ],
    })
        .then((res) => {
            console.log(`[${new Date().toLocaleString()}] (cron.js) - Sending rating reminder emails`);

            for (var i = 0; i < res.length; i++) {
                mailServer.add(res[i].User.email, MailType.rateVisited, {
                    name: res[i].User.name,
                });
                mailServer.send();
                console.log(
                    `[${new Date().toLocaleString()}] (cron.js) - Sent rating reminder email ${i}/${res.length}`
                );

                sleep(1000);
            }
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/reminder/ratings',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
            log(LogLevel.FATAL, 'cronjob/reminder/ratings', 'Errored @ ' + new Date() + ': ' + err);
        });

    // Find neighbors again and regenerate recommendations
    console.log(`[${new Date().toLocaleString()}] (cron.js) - Finding users that need new neighbors`);
    var users = (await db.User.findAll({})).filter((user) => {
        if (today - user.lastNeighbor > 3600 * 24 * 1000) {
            return user;
        }
    });

    // Split users in n = cpus subarrays and process in parallel
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
            console.log(
                `[${new Date().toLocaleString()}] (cron.js) - Finished finding neighbors and creating recommendations`
            );
        })
        .catch((err) => {
            ApplicationLogger.logBase(
                LogLevel.FATAL,
                null,
                null,
                'cronjob/recommender',
                null,
                'Errored @ ' + new Date() + ': ' + err
            );
        });
}

main();
