/* jshint esversion: 8 */
const CONFIG = require("./config.json");
const db = require("../server/db/models.js");
const langs = ['es', 'en'];

async function main() {
    db.sequelize.options.logging = false;
    console.log("Adding categories");

    for (let i = 0; i < CONFIG.categories.length; i++) {
        const cat = CONFIG.categories[i];

        // Create translations
        const name = await db.Translation.create({
            type: 1,
        });

        for (let j = 0; j < langs.length; j++) {
            // Create texts
            await db.Text.create({
                TranslationId: name.id,
                language: langs[j],
                string: cat.name[langs[j]],
            });
        }

        await db.Category.create({
            id: cat.id,
            fsqId: cat.fsqId,
            TranslationId: name.id,
        });
    }
}

main();