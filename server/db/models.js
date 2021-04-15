/* jshint esversion: 8 */
const CONNECTION_STRING = require('../config.json').database;
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(CONNECTION_STRING);

/*
 * Tables
 */
const log = {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    hostname: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    worker: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
};
const AccessLog = sequelize.define('AccessLog', log);
const ApplicationLog = sequelize.define('ApplicationLog', log);

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        surname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        lastAttempt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        lastNeighbor: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        lastRecommended: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        views: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        notificationsPlans: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        notificationsRatings: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    { paranoid: true }
);

const Session = sequelize.define(
    'Session',
    {
        UserId: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        maxAge: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    { paranoid: true }
);
User.hasMany(Session, { foreignKey: { name: 'UserId', allowNull: false } });
Session.belongsTo(User);

const PasswordRequest = sequelize.define(
    'PasswordRequest',
    {
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
    },
    { paranoid: true }
);
User.hasMany(PasswordRequest, { foreignKey: { allowNull: false } });
PasswordRequest.belongsTo(User);

const Login = sequelize.define(
    'Login',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        UserId: {
            type: DataTypes.DOUBLE,
            allowNull: false,
        },
        ip: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        paranoid: true,
        indexes: [
            {
                fields: ['UserId'],
            },
            {
                fields: ['UserId', 'ip'],
            },
        ],
    }
);
User.hasMany(Login, { foreignKey: { name: 'UserId', allowNull: false } });
Login.belongsTo(User);

const Place = sequelize.define(
    'Place',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        fsqId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        gmapsUrl: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        tripadvisorUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        osmId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lat: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        lon: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        timeSpent: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        zone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        postalCode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        state: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        placeUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        twitter: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        facebook: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        instagram: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wikidata: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wikipedia: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        wheelchair: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        images: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        rating: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
        count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        paranoid: true,
        indexes: [
            {
                fields: ['name'],
            },
        ],
    }
);

const Hour = sequelize.define(
    'Hour',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        PlaceId: {
            type: DataTypes.DOUBLE,
            allowNull: false,
        },
        day: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        monthStart: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        monthEnd: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        timeStart: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timeEnd: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        paranoid: true,
        indexes: [
            {
                fields: ['PlaceId'],
            },
        ],
    }
);
Place.hasMany(Hour, { foreignKey: { name: 'PlaceId', allowNull: false } });
Hour.belongsTo(Place);

const PopularTime = sequelize.define(
    'PopularTime',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        PlaceId: {
            type: DataTypes.DOUBLE,
            allowNull: false,
        },
        day: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        timeStart: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timeEnd: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        paranoid: true,
        indexes: [
            {
                fields: ['PlaceId'],
            },
        ],
    }
);
Place.hasMany(PopularTime, { foreignKey: { name: 'PlaceId', allowNull: false } });
PopularTime.belongsTo(Place);

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        fsqId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    { paranoid: true }
);

const Rating = sequelize.define('Rating', {
    UserId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    PlaceId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});
User.hasMany(Rating, { foreignKey: { name: 'UserId', allowNull: false } });
User.belongsToMany(Place, { through: Rating });
Place.hasMany(Rating, { foreignKey: { name: 'PlaceId', allowNull: false } });
Place.belongsToMany(User, { through: Rating });
Rating.belongsTo(User);
Rating.belongsTo(Place);

const Recommendation = sequelize.define('Recommendation', {
    UserId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    PlaceId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    probability: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    from: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});
User.hasMany(Recommendation, { foreignKey: { name: 'UserId', allowNull: false } });
User.belongsToMany(Place, { through: Recommendation });
Place.hasMany(Recommendation, { foreignKey: { name: 'PlaceId', allowNull: false } });
Place.belongsToMany(User, { through: Recommendation });
Recommendation.belongsTo(User);
Recommendation.belongsTo(Place);

const UserView = sequelize.define('UserView', {
    UserId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    CategoryId: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
});
User.hasMany(UserView, { foreignKey: { name: 'UserId', allowNull: false } });
User.belongsToMany(Category, { through: UserView });
Category.hasMany(UserView, { foreignKey: { name: 'CategoryId', allowNull: false } });
Category.belongsToMany(User, { through: UserView });
UserView.belongsTo(User);
UserView.belongsTo(Category);

const Plan = sequelize.define(
    'Plan',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        startDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        endDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        dayStart: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        dayEnd: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        zone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            // Internal Error: -1
            // Ok: 0
            // Planning: 1
            // Timed-out: 2
            // No solution: 3
            // Completed: 4
            defaultValue: 1,
        },
        startLon: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        startLat: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
    },
    { paranoid: true }
);
User.hasMany(Plan, { foreignKey: { allowNull: false } });
Plan.belongsTo(User);

const PlanItem = sequelize.define(
    'PlanItem',
    {
        id: {
            type: DataTypes.DOUBLE,
            autoIncrement: true,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        PlanId: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            primaryKey: true,
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        day: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        startTime: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        timeSpent: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        type: {
            // 0 - Empty
            // 1 - Place
            // 2 - Start
            // 3 - Wait
            // 4 - Rest
            // 5 - Custom
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        travelNext: {
            // In minutes
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        travelMode: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'walking',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        paranoid: true,
        indexes: [
            {
                fields: ['PlanId'],
            },
        ],
    }
);
Plan.hasMany(PlanItem, { foreignKey: { allowNull: false } });
Place.hasMany(PlanItem, { foreignKey: { allowNull: true } });
PlanItem.belongsTo(Plan);
PlanItem.belongsTo(Place);

/*
 * Relations
 */
const Distance = sequelize.define('Distance', {
    PlaceId1: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    PlaceId2: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    meters: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    time: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    mode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'walking',
    },
});
Place.hasMany(Distance, { foreignKey: { name: 'PlaceId1', allowNull: false } });
Place.hasMany(Distance, { foreignKey: { name: 'PlaceId2', allowNull: false } });

const Neighbor = sequelize.define('Neighbor', {
    UserId1: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    UserId2: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        primaryKey: true,
    },
    similarity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
});
User.hasMany(Neighbor, { foreignKey: { name: 'UserId1', allowNull: false } });
User.hasMany(Neighbor, { foreignKey: { name: 'UserId2', allowNull: false } });

const PlaceCategory = sequelize.define('PlaceCategory', {});
Category.hasMany(PlaceCategory, { foreignKey: { name: 'CategoryId', allowNull: false } });
Category.belongsToMany(Place, { through: PlaceCategory });
Place.hasMany(PlaceCategory, { foreignKey: { name: 'PlaceId', allowNull: false } });
Place.belongsToMany(Category, { through: PlaceCategory });
PlaceCategory.belongsTo(Category);
PlaceCategory.belongsTo(Place);

const UserCategory = sequelize.define('UserCategory', {});
User.hasMany(UserCategory, { foreignKey: { name: 'UserId', allowNull: false } });
User.belongsToMany(Category, { through: UserCategory });
Category.hasMany(UserCategory, { foreignKey: { name: 'CategoryId', allowNull: false } });
Category.belongsToMany(User, { through: UserCategory });
UserCategory.belongsTo(User);
UserCategory.belongsTo(Category);

exports.sequelize = sequelize;
exports.Category = Category;
exports.Distance = Distance;
exports.Hour = Hour;
exports.AccessLog = AccessLog;
exports.ApplicationLog = ApplicationLog;
exports.Login = Login;
exports.Neighbor = Neighbor;
exports.PasswordRequest = PasswordRequest;
exports.Place = Place;
exports.PlaceCategory = PlaceCategory;
exports.Plan = Plan;
exports.PlanItem = PlanItem;
exports.PopularTime = PopularTime;
exports.Rating = Rating;
exports.Recommendation = Recommendation;
exports.Session = Session;
exports.User = User;
exports.UserCategory = UserCategory;
exports.UserView = UserView;
