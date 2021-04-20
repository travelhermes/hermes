/*jshint esversion: 8 */
/* Imports */
const cluster = require('cluster');
const CONFIG = require('./config.json');
const cpus = Math.floor(require('os').cpus().length / 2);
const db = require('./db/models.js');
const fastify = require('fastify')({ logger: false });
const fastifyCookie = require('fastify-cookie');
const fastifyCors = require('fastify-cors');
const fastifyHelmet = require('fastify-helmet');
const fastifyRateLimit = require('fastify-rate-limit');
const fastifyStripHtml = require('fastify-strip-html');
const path = require('path');
const static = require('fastify-static');
const { AccountController } = require('./controllers/account.js');
const { ApplicationLogger, AccessLogger } = require('./logger/logger.js');
const { AuthController, AuthMiddleware } = require('./controllers/auth.js');
const { MailServer } = require('./mail/mail.js');
const { PlacesController } = require('./controllers/places.js');
const { PlannerController } = require('./controllers/planner.js');
const { RatingsController } = require('./controllers/ratings.js');
const { RecommenderController } = require('./controllers/recommender.js');

if (cluster.isMaster) {
    console.log(`Master with PID ${process.pid} is running`);

    for (let i = 0; i < cpus; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
    });
} else {
    /*
     * Global configs
     */
    db.sequelize.options.logging = false;

    /*
     * Mail Server
     */
    global.mailServer = new MailServer(
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
        },
        cluster.worker.id
    );
    mailServer.interval = setInterval(function () {
        //mailServer.messages = [];
        mailServer.send();
    }, 5000);

    /*
     * REST API Server config
     */
    // Declare onRequest
    fastify.addHook('onRequest', (request, reply, done) => {
        request.realIp = request.ip;
        request.startTime = new Date();
        request.worker = cluster.worker.id;
        if (request.headers['cf-connecting-ip']) {
            request.realIp = request.headers['cf-connecting-ip'];
        }
        done();
    });

    // Declare error handling
    fastify.addHook('onSend', async (request, reply, payload) => {
        reply.header('X-Worker', cluster.worker.id);

        request.endTime = new Date();

        if (reply.statusCode < 400) {
            AccessLogger.info(request, reply);
        } else if (reply.statusCode < 500) {
            AccessLogger.warning(request, reply);
        } else {
            AccessLogger.fatal(request, reply);
            ApplicationLogger.fatal(request, reply, { msg: payload });
        }

        console.log(
            `[Worker ${cluster.worker.id}] [${new Date().toLocaleString()}] ${
                request.endTime - request.startTime
            }ms (Request) ${reply.statusCode} ${request.realIp} - ${request.url}`
        );
    });

    fastify.setErrorHandler(async (error, request, reply) => {
        const logId = await ApplicationLogger.fatal(request, reply, {
            code: error.code,
            error: error.message,
            stack: error.stack,
        });
        reply.status(500).send({ error: 'Internal Server Error', statusCode: 500, logId: logId });
        return;
    });

    // Declare Security Headers, cookies and rate limiting
    fastify.register(fastifyHelmet, {
        contentSecurityPolicy: {
            directives: {
                'base-uri': ["'self'"],
                'connect-src': [
                    "'self'",
                    'travelhermes.com',
                    '*.travelhermes.com',
                    'openstreetmap.org',
                    '*.openstreetmap.org',
                ],
                'default-src': ["'self'"],
                'font-src': ["'self'"],
                'frame-src': ["'self'", 'https://*.hcaptcha.com'],
                'img-src': ["'self'", 'data:', 'travelhermes.com', '*.travelhermes.com'],
                'manifest-src': ["'self'"],
                'media-src': ["'self'"],
                'object-src': ["'none'"],
                'script-src': [
                    "'self'",
                    //"'unsafe-inline'",
                    'hcaptcha.com',
                    '*.hcaptcha.com',
                    'travelhermes.com',
                    '*.travelhermes.com',
                ],
                'style-src': ["'self'", "'unsafe-inline'"],
                'worker-src': ["'none'"],
            },
        },
    });
    fastify.register(fastifyCors, {
        origin: [/\.galisteo\.me$/, /\.hcaptcha\.com$/],
        methods: ['GET', 'PUT', 'POST'],
    });
    fastify.register(fastifyCookie, {
        secret: CONFIG.secret,
    });
    fastify.register(fastifyRateLimit, {
        global: false,
        max: 1000,
        timeWindow: '5m',
        keyGenerator: function (request) {
            return request.realIp;
        },
        redis: CONFIG.redis ? new Redis({ host: CONFIG.redis }) : null,
    });
    fastify.register(fastifyStripHtml, {
        stripFromResponse: true,
    });

    /*
     * Routes
     */
    fastify.register(static, {
        root: path.join(__dirname, '/web'),
    });

    new AuthMiddleware(fastify);
    new AuthController(fastify);
    new AccountController(fastify);
    new PlacesController(fastify);
    new RatingsController(fastify);
    new RecommenderController(fastify);
    new PlannerController(fastify);

    /*
     * Start server
     */
    fastify.listen(80, '0.0.0.0', function (err) {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
        console.log(`Server started on worker with PID ${process.pid}`);
    });
}
