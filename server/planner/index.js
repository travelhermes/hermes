/* jshint esversion: 8 */
const cluster = require('cluster');
const db = require('../db/models.js');
const fs = require('fs');
const geolib = require('geolib');
const { ApplicationLogger, LogLevel } = require('../logger/logger.js');
const { Op } = require('sequelize');
const { Process } = require('../utils/process.js');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Get element from array
 * @param  {Array<object>}  array Array to get element from
 * @param  {string}         key   Key to match
 * @param  {any}            value Value to match in key
 * @return                        element or null
 */
function getElementByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] == value) {
            return array[i];
        }
    }

    return null;
}

/**
 * Convert Date object into PDDL date object
 * @param  {Date}   date Date to get object from
 * @return {string}      Date object
 */
function getDayObj(date) {
    return `${MONTHS[date.getMonth()]}${date.getDate()}${date.getFullYear()}`;
}

/**
 * Convert hhmm or hh:mm format to minutes format, where 00:00 equals 0
 * @param  {string} time String to get time from
 * @return {number}      Converted value
 */
function getTime(time) {
    if (typeof time == 'number') return time;

    var result = 0;
    time = time.replace(':', '');
    if (time[0] == '+') {
        time = time.substring(1);
        result = 1440;
    }
    const hour = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2));
    result += hour * 60 + minutes;
    return result;
}

/**
 * Convert minutes format to hh:mm, where 0 equals 00:00
 * @param  {number} time Number to get time from
 * @return {string}      Converted value
 */
function getTimeString(time) {
    var hours = Math.floor(time / 60);
    var minutes = Math.ceil((time / 60 - hours) * 60);
    while (minutes >= 60) {
        minutes -= 60;
        hours++;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Checks if date is between given months
 * @param  {Date}   date       Date to check
 * @param  {number} monthStart Starting month, where Jan is 0
 * @param  {number} monthEnd   Ending month, where Jan is 0. If lower than monthStart, period is between years.
 * @return {boolean}           true if between months, false otherwise
 */
function betweenMonth(date, monthStart, monthEnd) {
    const month = date.getMonth();
    if (monthEnd < monthStart) {
        if (monthStart <= month || month <= monthEnd) {
            return true;
        }
    } else if (monthStart <= month && month <= monthEnd) {
        return true;
    }

    return false;
}

/**
 * Get distance between two places. If places are not in database, returns distance between coordinates.
 * @param  {Place} place1 First place
 * @param  {Place} place2 Second place
 * @return {Array}        Returns [distance in meters, time in minutes]. [0,0] if no latitude and longitude is provided
 */
function getDistance(place1, place2) {
    return new Promise((resolve, reject) => {
        if ((!place1.lat && !place1.lon) || (!place2.lat && !place2.lon)) {
            resolve([0, 0, 'walking']);
            return;
        }
        if (typeof place1.id != 'number' || typeof place2.id != 'number') {
            // Multiply by a ratio, which is the average of ratios between db distance and coord distance
            // Should be changed to Graphhopper Routing API/Google Maps Routing API
            // however, Graphhopper doesn't work on ARM and Google Maps is crazy expensive
            var dist =
                geolib.getDistance(
                    { latitude: place1.lat, longitude: place1.lon },
                    { latitude: place2.lat, longitude: place2.lon }
                ) * 1.2383493909051912;
            var time = dist / 84; // Walking = 1.4m/s = 84 m/min

            if (time > 60) {
                time = dist / 830; // Driving = 50km/h = ~830 m/min
                resolve([dist, time, 'car']);
                return;
            }

            resolve([dist, time, 'walking']);
            return;
        }
        db.Distance.findOne({
            where: {
                [Op.or]: [
                    {
                        [Op.and]: [
                            {
                                PlaceId1: place1.id,
                            },
                            {
                                PlaceId2: place2.id,
                            },
                        ],
                    },
                    {
                        [Op.and]: [
                            {
                                PlaceId1: place2.id,
                            },
                            {
                                PlaceId2: place1.id,
                            },
                        ],
                    },
                ],
            },
        })
            .then((res) => {
                resolve([res.meters, res.time, res.mode]);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Creates a PDDL problem file.
 * @param  {number}         planId   ID of plan
 * @param  {Array<Place>}   places   Array of places with hours
 * @param  {Array<Date>}    days     Array of dates
 * @param  {object}         start    Object of starting place. Must have id = 'start', lat and lon.
 * @param  {number}         dayStart Time at which the day begins, as number, where 0 equals 00:00
 * @param  {number}         dayEnd   Time at which the day ends, as number, where 0 equals 00:00
 * @param  {Boolean}        quicker  If true, time spent is reduced by 1.2
 * @return {Promise}        Resolves with problem string, rejects with null
 */
function createProblem(planId, places, days, start, dayStart, dayEnd, quicker = false) {
    return new Promise(async (resolve, reject) => {
        // Define days
        var dayObjs = [];
        var nextDay = [];
        for (let i = 0; i < days.length; i++) {
            dayObjs.push(getDayObj(days[i]));

            if (i + 1 < days.length) {
                nextDay.push(`(next-day ${getDayObj(days[i])} ${getDayObj(days[i + 1])})`);
            }
        }

        // Define places
        var placeObj = [];
        for (let i = 0; i < places.length; i++) {
            placeObj.push(`place${places[i].id}`);
        }

        var placeHours = [];
        var placeDistances = [];
        var goals = [];
        for (let i = 0; i < places.length; i++) {
            const place = places[i];

            // Setup place hours
            if (place.hours.length == 0) {
                for (let j = 0; j < days.length; j++) {
                    let dayObj = getDayObj(days[j]);
                    placeHours.push(`(= (opens place${place.id} ${dayObj}) 0)`);
                    placeHours.push(`(= (closes place${place.id} ${dayObj}) 1440)`);
                }
            } else {
                for (let j = 0; j < place.hours.length; j++) {
                    const hour = place.hours[j];
                    var timeStart = getTime(hour.timeStart);
                    var timeEnd = getTime(hour.timeEnd);
                    let dayObj = getDayObj(hour.day);

                    if (hour.monthStart == -1) {
                        placeHours.push(`(= (opens place${place.id} ${dayObj}) ${timeStart})`);
                        placeHours.push(`(= (closes place${place.id} ${dayObj}) ${timeEnd})`);
                    } else if (betweenMonth(hour.day, place.monthStart, place.monthEnd)) {
                        placeHours.push(`(= (opens place${place.id} ${dayObj}) ${timeStart})`);
                        placeHours.push(`(= (closes place${place.id} ${dayObj}) ${timeEnd})`);
                    }
                }
            }

            placeHours.push(
                `(= (visit-duration place${place.id}) ${quicker ? (place.timeSpent) / 1.2 : place.timeSpent})`
            );
            placeHours.push(`(unvisited place${place.id})`);

            // Setup distances and travel time
            var dist;
            try {
                dist = await getDistance(place, start);
            } catch (e) {
                reject(null);
            }
            // Start to place
            placeDistances.push(`(= (distance start place${place.id}) ${Math.ceil(dist[0])})`);
            placeDistances.push(`(= (travel-time start place${place.id}) ${Math.ceil(dist[1])})`);
            // Place to end
            placeDistances.push(`(= (distance place${place.id} end) ${Math.ceil(dist[0])})`);
            placeDistances.push(`(= (travel-time place${place.id} end) ${Math.ceil(dist[1])})`);
            //Place to wait
            placeDistances.push(`(= (distance place${place.id} wait) 0)`);
            placeDistances.push(`(= (travel-time place${place.id} wait) 0)`);

            // Place to place
            for (let j = 0; j < places.length; j++) {
                if (place.id == places[j].id) {
                    continue;
                }

                try {
                    dist = await getDistance(place, places[j]);
                } catch (e) {
                    reject(null);
                }
                placeDistances.push(`(= (distance place${place.id} place${places[j].id}) ${Math.ceil(dist[0])})`);
                placeDistances.push(`(= (travel-time place${place.id} place${places[j].id}) ${Math.ceil(dist[1])})`);
            }

            // Setup goals
            goals.push(`(visited place${place.id})`);
        }

        resolve(`(define (problem plan${planId})
            (:domain hermes)
            (:objects
                ${placeObj.join(' ')} - place
                ${dayObjs.join(' ')} - day
            )
            (:init
                ;; Initial setup
                (= (day-start) ${dayStart})
                (= (day-end) ${dayEnd})
                (= (current-time) ${dayStart})
                (current-day ${dayObjs[0]})
                (current-place start)
                (= (heuristic) 0)

                ${nextDay.join('\n            ')}

                ${placeHours.join('\n            ')}

                (= (distance start wait) 0)
                (= (travel-time start wait) 0)
                (= (distance wait start) 0)
                (= (travel-time wait start) 0)

                ${placeDistances.join('\n            ')}
            )
            (:goal (and 
                ${goals.join('\n            ')}
                (current-place end)
            ))
            (:metric minimize (heuristic))
        )`);
    });
}
exports.createProblem = createProblem;

/**
 * Parse output from PDDL planner
 * @param  {number}         planId   ID from plan
 * @param  {string}         output   Output of the PDDL parser
 * @param  {Array<Place>}   places   Array of places with hours
 * @param  {object}         start    Object of starting place. Must have id = 'start', lat and lon.
 * @param  {number}         dayStart Time at which the day begins, as number, where 0 equals 00:00
 * @param  {Boolean}        quicker  If true, time spent is reduced by 1.2
 * @return {Promise}        Resolves with items, rejects with status where 1 = plan not found, and 2 = internal error
 */
function parseSolution(planId, output, places, start, dayStart, quicker = false) {
    return new Promise(async (resolve, reject) => {
        if (output.indexOf('ff: found legal plan as follows') == -1) {
            reject({
                status: 1,
            });
            return;
        }

        var steps = output
            .substring(output.indexOf('step'), output.indexOf('plan cost'))
            .replace('step', '    ')
            .split('\n')
            .filter((step) => {
                return step.length > 0 ? step : undefined;
            });
        steps = steps.map((step) => {
            return step.replace(/\s*[0-9]+: /g, '');
        });

        var items = [];
        // {
        //     PlanId:      // PlanId
        //     PlaceId:     // PlaceId, if exists
        //     day:         // Day
        //     order:       // Order of item
        //     startTime:   // Starting time
        //     endTime:     // Ending time
        //     type:        // Type of item: 0 - Empty, 1 - Place, 2 - Start, 3 - Wait, 4 - Custom
        //     travelNext:  // Time to travel to next place
        // }

        // Reduce WAITs to one entry + ID
        var aux = [];
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i].toLowerCase();
            if (step.indexOf('start-wait') == 0) {
                let j = i + 1;
                var current = steps[j].toLowerCase();
                var count = 0;
                while (current.indexOf('end-wait') != 0) {
                    count += 15;

                    current = steps[j].toLowerCase();
                    j++;
                }
                i = j - 1;
                aux.push({
                    type: 'wait',
                    id: i,
                    timeSpent: count - 15,
                });

                // Add to items every WAIT
                items.push({
                    PlanId: planId,
                    PlaceId: null,
                    day: null,
                    timeSpent: null,
                    order: null,
                    startTime: null,
                    endTime: null,
                    type: 3,
                    travelNext: null,
                    aditional: { waitId: i },
                });
            } else {
                aux.push(step);
            }
        }

        // Add to items every place
        for (let i = 0; i < places.length; i++) {
            items.push({
                PlanId: planId,
                PlaceId: places[i].id,
                day: null,
                timeSpent: places[i].timeSpent,
                order: null,
                startTime: null,
                endTime: null,
                type: typeof places[i].id == 'number' ? 1 : 4,
                travelNext: null,
                aditional: {
                    place: places[i],
                },
            });
        }

        var currentDay = 0;
        var order = 0;
        var currentTime = dayStart;
        for (var i = 0; i < aux.length; i++) {
            const step = aux[i];
            // Case 1: WAIT
            if (typeof step == 'object') {
                for (let j = 0; j < items.length; j++) {
                    if (items[j].aditional.waitId == step.id) {
                        items[j].day = currentDay;
                        items[j].order = order;
                        items[j].timeSpent = step.timeSpent;
                        items[j].startTime = getTimeString(currentTime);
                        currentTime += step.timeSpent;
                        items[j].endTime = getTimeString(currentTime);
                        items[j].travelNext = 0;
                        break;
                    }
                }
                order++;
                continue;
            }
            var splits = step.split(' ');
            // Case 2: START-DAY
            if (splits[0] == 'start-day') {
                let id = splits[1].replace('place', '');
                for (let j = 0; j < items.length; j++) {
                    if (items[j].PlaceId == id) {
                        let dist;
                        try {
                            dist = await getDistance(start, items[j].aditional.place);
                        } catch (e) {
                            reject({
                                status: 2,
                            });
                            return;
                        }

                        // Push day start
                        items.push({
                            PlanId: planId,
                            PlaceId: null,
                            day: currentDay,
                            timeSpent: 0,
                            order: order,
                            startTime: getTimeString(currentTime),
                            endTime: getTimeString(currentTime),
                            type: 2,
                            travelNext: dist[1],
                            travelMode: dist[2],
                        });
                        order++;
                        currentTime += dist[1];

                        // Update place
                        items[j].order = order;
                        items[j].day = currentDay;
                        items[j].startTime = getTimeString(currentTime);

                        //order++;
                        break;
                    }
                }
            }
            // Case 3: MOVE
            else if (splits[0] == 'move') {
                let src = getElementByKey(places, 'id', splits[1].replace('place', ''));
                let dest = getElementByKey(places, 'id', splits[2].replace('place', ''));
                for (let j = 0; j < items.length; j++) {
                    if (items[j].PlaceId == src.id) {
                        let dist;
                        try {
                            dist = await getDistance(src, dest);
                        } catch (e) {
                            reject({
                                status: 2,
                            });
                            return;
                        }

                        // Update src
                        items[j].order = order;
                        items[j].day = currentDay;
                        currentTime += dist[1];
                        items[j].travelNext = dist[1];
                        items[j].travelMode = dist[2];

                        order++;
                        break;
                    }
                }
            }
            // Case 4: END-DAY
            else if (splits[0] == 'end-day') {
                let id = splits[1].replace('place', '');
                for (let j = 0; j < items.length; j++) {
                    if (items[j].PlaceId == id) {
                        let dist;
                        try {
                            dist = await getDistance(items[j].aditional.place, start);
                        } catch (e) {
                            reject({
                                status: 2,
                            });
                            return;
                        }

                        // Update place
                        items[j].order = order;
                        items[j].day = currentDay;
                        items[j].travelNext = -1;
                        items[j].travelMode = dist[2];

                        order++;
                        currentTime += dist[1];
                        break;
                    }
                }
            }
            // Case 5: VISIT
            else if (splits[0] == 'visit') {
                let id = splits[1].replace('place', '');
                for (let j = 0; j < items.length; j++) {
                    if (items[j].PlaceId == id) {
                        // Update place
                        items[j].startTime = getTimeString(currentTime);
                        currentTime += quicker
                            ? (items[j].aditional.place.timeSpent) / 1.2
                            : items[j].aditional.place.timeSpent;
                        items[j].endTime = getTimeString(currentTime);

                        break;
                    }
                }
            }
            // Case 5: CHANGE-DAY
            else if (splits[0] == 'change-day') {
                order = 0;
                currentDay++;
                currentTime = dayStart;
            }
        }

        items.sort(function (a, b) {
            if (a.day === b.day) {
                return a.order - b.order;
            }
            return a.day - b.day;
        });

        for (let i = 0; i < items.length; i++) {
            if (typeof items[i].PlaceId == 'string') {
                items[i].PlaceId = null;
            }
            delete items[i].aditional;

            // If route starts waiting, swap with start
            if (items[i].type == 3 && items[i + 1] && items[i + 1].type == 2) {
                items[i + 1].startTime = items[i].startTime;
                items[i + 1].endTime = items[i].startTime;
                items[i].travelNext = items[i + 1].travelNext;
                items[i + 1].travelNext = 0;

                var swap = items[i + 1].order;
                items[i + 1].order = items[i].order;
                items[i].order = swap;

                i++;
            }
        }

        items.sort(function (a, b) {
            if (a.day === b.day) {
                return a.order - b.order;
            }
            return a.day - b.day;
        });

        resolve(items);
    });
}
exports.parseSolution = parseSolution;

/**
 *
 * @param  {number}         planId   ID of plan
 * @param  {Array<Place>}   places   Array of places with hours
 * @param  {Array<Date>}    days     Array of dates
 * @param  {object}         start    Object of starting place. Must have id = 'start', lat and lon.
 * @param  {number}         dayStart Time at which the day begins, as number, where 0 equals 00:00
 * @param  {number}         dayEnd   Time at which the day ends, as number, where 0 equals 00:00
 * @param  {Boolean}        quicker  If true, time spent is reduced by 1.2
 */
exports.plan = async function (plan, places, days, start, dayStart, dayEnd, quicker) {
    // Client: If wait is followed by start, skip wait
    var problem;
    try {
        problem = await createProblem(plan.id, places, days, start, dayStart, dayEnd, quicker);
    } catch (error) {
        ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/creator', null, error);
        plan.status = -1;
        await plan.save();
        return;
    }

    const path = __dirname + '/problems/plan' + plan.id + '.pddl';
    try {
        fs.writeFileSync(path, problem);
    } catch (error) {
        ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/writer', null, error);
        plan.status = -1;
        await plan.save();
        return;
    }

    // Run planner for 5 min. with Weighted A*.
    // If first run times out, run without cost optimization.
    var args = ['-o', __dirname + '/domain.pddl', '-f', path, '-s', '5'];
    var output;
    var proc = new Process(__dirname + '/ff', args);
    try {
        output = await proc.runWithTimeout(300);
    } catch (error) {
        if (error.code == -1) {
            // Timed out. Default to no cost optimization
            args = ['-o', __dirname + '/domain.pddl', '-f', path];
            proc = new Process(__dirname + '/ff', args);
            try {
                output = await proc.runWithTimeout(300);
            } catch (error) {
                if (error.code == -1) {
                    // Timed out
                    plan.status = 2;
                    await plan.save();
                } else {
                    ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/planner/simple', null, error);
                }
                return;
            }
        } else {
            plan.status = -1;
            await plan.save();
            ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/planner', null, error);
            return;
        }
    }

    var items;
    try {
        items = await parseSolution(plan.id, output, places, start, dayStart, quicker);
    } catch (error) {
        if (error.status == 1) {
            // Empty solution
            plan.status = 3;
            await plan.save();
        } else {
            ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/parser', null, error);
        }
        return;
    }

    try {
        await db.PlanItem.bulkCreate(items);
    } catch (error) {
        ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/db', null, error);
        plan.status = -1;
        await plan.save();
        return;
    }

    try {
        fs.rmSync(path);
    } catch (error) {
        ApplicationLogger.logBase(LogLevel.ERROR, cluster.worker.id, plan.UserId, null, 'planner/plan/cleanup', null, error);
    }

    plan.status = 0;
    await plan.save();
};
