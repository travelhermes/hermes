/* jshint esversion: 8 */
const CONFIG = require("./config.json");
const db = require("../server/db/models.js");

async function main() {
    db.sequelize.options.logging = false;
    console.log("Adding categories");

    for (let i = 0; i < CONFIG.foursquare.categories.length; i++) {
        const cat = CONFIG.foursquare.categories[i];
        await db.Category.create({
            id: cat.id,
            fsqId: cat.fsqId,
            name: cat.name,
        });
    }
}

main();