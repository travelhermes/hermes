const DB = require("./models.js");

async function sync() {
    await DB.sequelize.sync({ force: true });
    console.log("All models were synchronized successfully.");
    DB.sequelize.close();
}

sync();
