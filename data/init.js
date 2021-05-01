/* jshint esversion: 8 */
const db = require("../server/db/models.js");

async function sync() {
    await db.sequelize.sync({ force: true });
    console.log("All models were synchronized successfully.");
    db.sequelize.close();
}

sync();
