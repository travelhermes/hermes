/*jshint esversion: 8 */
/* Imports */
const cluster = require('cluster');
const cpus = Math.floor(require('os').cpus().length / 2);
const db = require('./db/models.js');
const fastify = require('fastify')({ logger: false });
const fastifyCookie = require('fastify-cookie');
const fastifyCors = require('fastify-cors');
const fastifyHelmet = require('fastify-helmet');
const fastifyLanguageParser = require('fastify-language-parser');
const fastifyRateLimit = require('fastify-rate-limit');
const fastifyStripHtml = require('fastify-strip-html');
const fastifyUrlData = require('fastify-url-data');
const path = require('path');
const static = require('./controllers/static.js');
const { AccountController } = require('./controllers/account.js');
const { ApplicationLogger, AccessLogger } = require('./logger/logger.js');
const { AuthController, AuthMiddleware } = require('./controllers/auth.js');
const { MailServer } = require('./mail/mail.js');
const { PlacesController } = require('./controllers/places.js');
const { PlannerController } = require('./controllers/planner.js');
const { RatingsController } = require('./controllers/ratings.js');
const { RecommenderController } = require('./controllers/recommender.js');
const { Session } = require('./controllers/session.js');

// Check env vars
if (!process.env.SERVER_HOST) {
    console.error('Error: Missing SERVER_HOST env var');
    process.exit(1);
}
if (!process.env.SERVER) {
    console.error('Error: Missing SERVER env var');
    process.exit(1);
}
if (!process.env.SECRET) {
    console.error('Error: Missing SECRET env var');
    process.exit(1);
}
if (!process.env.HCAPTCHA_SECRET) {
    console.error('Error: Missing HCAPTCHA_SECRET env var');
    process.exit(1);
}
if (!process.env.HCAPTCHA_SITEKEY) {
    console.error('Error: Missing HCAPTCHA_SITEKEY env var');
    process.exit(1);
}
if (!process.env.MAIL_SERVICE) {
    console.error('Error: Missing MAIL_SERVICE env var');
    process.exit(1);
}
if (!process.env.MAIL_USER) {
    console.error('Error: Missing MAIL_USER env var');
    process.exit(1);
}
if (!process.env.MAIL_PASSWORD) {
    console.error('Error: Missing MAIL_PASSWORD env var');
    process.exit(1);
}
if (!process.env.MAIL_FROM) {
    console.error('Error: Missing MAIL_FROM env var');
    process.exit(1);
}

// SIGINT, SIGTERM handler
async function closeHandler(signal) {
   console.log(`Received signal to terminate: ${signal}`);

   await fastify.close();
   await db.close();
   process.exit();
}

// Exception handlers
process.on("uncaughtException", async function(err) {
    console.log(`Terminating due to Uncaught Exception: ${signal}`);
    await fastify.close();
    await db.close();

    process.exit();
});

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
    process.on('SIGINT', closeHandler);
    process.on('SIGTERM', closeHandler);

    /*
     * Mail Server
     */
    global.mailServer = new MailServer(
        {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
        },
        process.env.MAIL_SERVICE
    );
    mailServer.interval = setInterval(function () {
        //mailServer.messages = [];
        mailServer.send();
    }, 5000);
    global.fastify = fastify;

    /*
     * REST API Server config
     */
    // Parse language
    fastify.register(fastifyLanguageParser, { order: ['header'], fallbackLng: 'es', supportedLngs: ['en', 'es'] });

    // URL data
    fastify.register(fastifyUrlData);

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
        secret: process.env.SECRET,
    });
    fastify.register(fastifyRateLimit, {
        global: false,
        max: 1000,
        timeWindow: '5m',
        keyGenerator: function (request) {
            return request.realIp;
        },
        redis: process.env.REDIS ? new Redis({ host: process.env.REDIS }) : null,
    });

    // Request handler to get realIp, worker and language
    fastify.addHook('onRequest', async (request, reply) => {
        request.realIp = request.ip;
        request.startTime = new Date();
        request.worker = cluster.worker.id;
        if (request.headers['cf-connecting-ip']) {
            request.realIp = request.headers['cf-connecting-ip'];
        }
        
        // Set language
        if (request.query.lang) {
            request.detectedLng = request.query.lang;
        } else {
            const user = await Session.getSessionUser(request);
            if (user) {
                request.detectedLng = user.lang;
            }
        }

        return;
    });

    // Reply handler that logs events and errors
    fastify.addHook('onSend', async (request, reply, payload) => {
        reply.header('X-Worker', cluster.worker.id);
        reply.header('Permissions-Policy', 'interest-cohort=()');
        reply.header('X-Frame-Options', 'sameorigin');

        request.endTime = new Date();

        if (reply.statusCode < 400) {
            AccessLogger.info(request, reply);
        } else if (reply.statusCode < 500) {
            AccessLogger.warning(request, reply);
        } else {
            AccessLogger.fatal(request, reply);
            //ApplicationLogger.fatal(request, reply, { msg: payload });
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

    /*
     * Routes
     */
    new AuthMiddleware(fastify);
    new AuthController(fastify);
    new AccountController(fastify);
    new PlacesController(fastify);
    new RatingsController(fastify);
    new RecommenderController(fastify);
    new PlannerController(fastify);

    fastify.addHook('onRequest', static);

    /*
     * Start server
     */
    fastify.listen(process.env.PORT || 80, '0.0.0.0', function (err) {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
        console.log(`Server started on worker with PID ${process.pid}`);
    });
}
