/* jshint esversion: 8 */
const CONFIG = require("../config.json");
const DB = require("./models.js");
const http = require("http");
const ora = require("ora");
const places = require("./db.json").places;

function getDistance(place1, place2, mode) {
    const url =
        CONFIG.graphhopper +
        "/route?" +
        mode +
        "&point=" +
        place1.lat +
        "," +
        place1.lon +
        "&point=" +
        place2.lat +
        "," +
        place2.lon;

    return new Promise((resolve) => {
        http.get(url, (resp) => {
            let data = "";

            resp.on("data", (chunk) => {
                data += chunk;
            });

            resp.on("end", () => {
                var res = JSON.parse(data);
                if (res.paths) {
                    resolve([res.paths[0].distance, res.paths[0].time / 1000 / 60]);
                } else {
                    resolve(null);
                }
            });
        }).on("error", (err) => {
            resolve(null);
        });
    });
}

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

async function main() {
    DB.sequelize.options.logging = false;
    var spinner = ora("Adding categories").start();

    for (let i = 0; i < CONFIG.foursquare.categories.length; i++) {
        const cat = CONFIG.foursquare.categories[i];
        await DB.Category.create({
            id: cat.id,
            fsqId: cat.fsqId,
            name: cat.name,
        });
    }

    spinner.succeed();
    spinner = ora("Adding places").start();

    for (let i = 0; i < places.length; i++) {
        try {
            var description = "";
            if (places[i].description) {
                description = places[i].description;
            } else if (places[i].gmapsDescription) {
                description = places[i].gmapsDescription;
            } else if (places[i].osmDescription) {
                description = places[i].osmDescription;
            } else if (places[i].fsqDescription) {
                description = places[i].fsqDescription;
            }

            var timeSpent = places[i].timeSpent || 0;
            // If timeSpent is not defined, default to averages
            if (!timeSpent) {
                var count = 0;
                for (var j = 0; j < places[i].categories.length; j++) {
                    var cat = getElementByKey(CONFIG.foursquare.categories, "fsqId", places[i].categories[j]);
                    if (cat) {
                        count++;
                        timeSpent += cat.timeSpent;
                    }
                }
                timeSpent /= count;
            }

            const place = await DB.Place.create({
                id: places[i].id,
                fsqId: places[i].fsqId,
                gmapsUrl: places[i].gmapsUrl,
                osmId: places[i].osmRel,
                name: places[i].name,
                description: description,
                timeSpent: timeSpent * 60,
                lat: places[i].lat,
                lon: places[i].lon,
                address: places[i].address,
                postalCode: places[i].postalCode,
                city: places[i].city,
                state: places[i].state,
                country: places[i].country,
                placeUrl: places[i].placeUrl,
                phone: places[i].contact.formattedPhone,
                twitter: places[i].contact.twitter,
                facebook: places[i].contact.facebook,
                instagram: places[i].contact.instagram,
                wikidata: places[i].wikidata,
                wikipedia: places[i].wikipedia,
                wheelchair: places[i].wheelchair,
                images: places[i].images,
            });

            for (let j = 0; j < places[i].hours.length; j++) {
                const hour = places[i].hours[j];
                if (hour.timeStart == "0000" && hour.timeEnd == "2359") {
                    continue;
                }
                await DB.Hour.create({
                    PlaceId: place.id,
                    day: hour.day,
                    monthStart: hour.monthStart,
                    monthEnd: hour.monthEnd,
                    timeStart: hour.timeStart,
                    timeEnd: hour.timeEnd,
                });
            }

            for (let j = 0; j < places[i].popular.length; j++) {
                const hour = places[i].popular[j];
                if (hour.timeStart == "0000" && hour.timeEnd == "2359") {
                    continue;
                }
                await DB.PopularTime.create({
                    PlaceId: place.id,
                    day: hour.day,
                    timeStart: hour.timeStart,
                    timeEnd: hour.timeEnd,
                });
            }

            var categoryUnknownCount = 0;
            for (let j = 0; j < places[i].categories.length; j++) {
                const category = await DB.Category.findOne({
                    where: {
                        fsqId: places[i].categories[j],
                    },
                });

                if (category == null) {
                    categoryUnknownCount++;
                    continue;
                }

                var placeId = place.id;
                var categoryId = category.id;

                await DB.PlaceCategory.create({
                    PlaceId: placeId,
                    CategoryId: categoryId,
                });
            }

            if (categoryUnknownCount == places[i].categories.length) {
                console.error(places[i].name + " has no known categories");
            }
        } catch (e) {
            console.error(places[i].id + ", " + places[i].name);
            console.error(e);
            console.error("");
            process.exit(1);
        }
    }
    spinner.succeed();

    spinner = ora("Calculating distances").start();

    const p = await DB.Place.findAll();
    for (var i = 0; i < p.length; i++) {
        for (var j = i + 1; j < p.length; j++) {
            var dist;
            var mode;
            var distWalking = await getDistance(p[i], p[j], "profile=walking");
            var distCar = await getDistance(p[i], p[j], "vehicle=car");

            if (distWalking && distWalking[1] < 60) {
                dist = distWalking;
                mode = "walking";
            } else if (distCar) {
                dist = distCar;
                mode = "car";
            } else {
                console.log("Failed to find route between ", p[i].id, p[j].id);
                continue;
            }

            await DB.Distance.create({
                PlaceId1: p[i].id,
                PlaceId2: p[j].id,
                meters: dist[0],
                time: dist[1],
                mode: mode,
            });
        }
    }

    spinner.succeed();
}

main();
