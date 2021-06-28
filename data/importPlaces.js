/* jshint esversion: 8 */
const CONFIG = require('./config.json');
const db = require('../server/db/models.js');
const http = require('http');

if (!process.argv[2]) {
    console.log('Error: No database file was provided');
    process.exit(1);
}

const places = require('./' + process.argv[2]).places;

const langs = ['es', 'en'];

function getDistance(place1, place2, mode) {
    const url =
        CONFIG.graphhopper +
        '/route?' +
        mode +
        '&point=' +
        place1.lat +
        ',' +
        place1.lon +
        '&point=' +
        place2.lat +
        ',' +
        place2.lon;

    return new Promise((resolve) => {
        http.get(url, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                var res = JSON.parse(data);
                if (res.paths) {
                    resolve([res.paths[0].distance, res.paths[0].time / 1000 / 60]);
                } else {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            resolve(null);
        });
    });
}

async function main() {
    db.sequelize.options.logging = false;
    console.log('Adding places');

    for (let i = 0; i < places.length; i++) {
        try {
            var place = await db.Place.findOne({
                where: {
                    osmId: places[i].osmId,
                    lat: places[i].lat,
                    lon: places[i].lon,
                },
            });
            if (place) {
                continue;
            }

            // Create translations
            const name = await db.Translation.create({
                type: 1,
            });
            const description = await db.Translation.create({
                type: 2,
            });

            for (let j = 0; j < langs.length; j++) {
                const lang = langs[j];
                // Create texts
                await db.Text.create({
                    TranslationId: name.id,
                    language: langs[j],
                    string: places[i].name[lang],
                });
                await db.Text.create({
                    TranslationId: description.id,
                    language: langs[j],
                    string: places[i].description[lang],
                });
            }

            place = await db.Place.create({
                fsqId: places[i].fsqId,
                gmapsUrl: places[i].gmapsUrl,
                osmId: places[i].osmId,
                timeSpent: places[i].timeSpent,
                lat: places[i].lat,
                lon: places[i].lon,
                address: places[i].address,
                postalCode: places[i].postalCode,
                city: places[i].city,
                zone: places[i].zone,
                state: places[i].state,
                country: places[i].country,
                placeUrl: places[i].placeUrl,
                phone: places[i].formattedPhone,
                twitter: places[i].twitter,
                facebook: places[i].facebook,
                instagram: places[i].instagram,
                wikidata: places[i].wikidata,
                wikipedia: places[i].wikipedia,
                wheelchair: places[i].wheelchair,
                images: places[i].images,
                TranslationNameId: name.id,
                TranslationDescriptionId: description.id 
            });

            for (let j = 0; j < places[i].hours.length; j++) {
                const hour = places[i].hours[j];
                if (hour.timeStart == '0000' && hour.timeEnd == '2359') {
                    continue;
                }
                await db.Hour.create({
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
                if (hour.timeStart == '0000' && hour.timeEnd == '2359') {
                    continue;
                }
                await db.PopularTime.create({
                    PlaceId: place.id,
                    day: hour.day,
                    timeStart: hour.timeStart,
                    timeEnd: hour.timeEnd,
                });
            }

            var categoryUnknownCount = 0;
            for (let j = 0; j < places[i].categories.length; j++) {
                const category = await db.Category.findOne({
                    where: {
                        id: places[i].categories[j],
                    },
                });

                if (category == null) {
                    categoryUnknownCount++;
                    continue;
                }

                var placeId = place.id;
                var categoryId = category.id;

                await db.PlaceCategory.create({
                    PlaceId: placeId,
                    CategoryId: categoryId,
                });
            }

            if (categoryUnknownCount == places[i].categories.length) {
                console.error(places[i].name + ' has no known categories');
            }
        } catch (e) {
            console.error((i+1) + ', ' + places[i].name['es']);
            console.error(e);
            console.error('');
            process.exit(1);
        }
    }

    console.log('Calculating distances');

    const p = await db.Place.findAll();
    for (var i = 0; i < p.length; i++) {
        for (var j = i + 1; j < p.length; j++) {
            var dist;
            var mode;
            var distWalking = await getDistance(p[i], p[j], 'profile=walking');
            var distCar = await getDistance(p[i], p[j], 'vehicle=car');

            if (distWalking && distWalking[1] < 60) {
                dist = distWalking;
                mode = 'walking';
            } else if (distCar) {
                dist = distCar;
                mode = 'car';
            } else {
                console.log('Failed to find route between ', p[i].id, p[j].id);
                continue;
            }

            await db.Distance.create({
                PlaceId1: p[i].id,
                PlaceId2: p[j].id,
                meters: dist[0],
                time: dist[1],
                mode: mode,
            });
        }
    }
}

main();
