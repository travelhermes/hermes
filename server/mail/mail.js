/* jshint esversion: 8 */
const cluster = require('cluster');
const CONFIG = require('../config.json');
const { ApplicationLogger, LogLevel } = require('../logger/logger.js');
const nodemailer = require('nodemailer');
const pug = require('pug');

const MailType = {
    passwordRequest: 0,
    passwordChange: 1,
    newAccount: 2,
    confirmDelete: 3,
    newLogin: 4,
    emailChange: 5,
    startPlan: 6,
    rateVisited: 7,
};

const MailSubject = [
    'Solicitud de recuperación de contraseña',
    'Se ha actualizado la contraseña de la cuenta',
    '¡Bienvenido a Hermes!',
    'Confirmación de eliminación de cuenta',
    'Se ha producido un nuevo inicio de sesión en tu cuenta',
    'Se ha cambiado la dirección de correo asociada a la cuenta',
    'Uno de tus planes empieza mañana. ¿Estás preparado?',
    '¡Hey! Recuerda puntuar los sitios que visitaste ayer',
];

class MailServer {
    constructor(host, port, auth = {}, service = null, secure = true, tls = {}, worker = 0) {
        this.host = host;
        this.port = port;
        this.auth = auth;
        this.service = service;
        this.secure = secure;
        this.tls = tls;
        this.messages = [];
        this.transport = null;
        this.worker = worker;
    }

    /**
     * Send email in queue. If transport is not created, creates it.
     */
    send() {
        // Create transport singleton on first email
        if (this.transport == null) {
            if (this.service) {
                this.transport = nodemailer.createTransport({
                    service: this.service,
                    auth: this.auth,
                });
            } else {
                this.transport = nodemailer.createTransport({
                    host: this.host,
                    port: this.port,
                    auth: this.auth,
                    secure: this.secure,
                    tls: this.tls,
                });
            }

            this.transport.verify(function (err) {
                if (err) {
                    log(LogLevel.FATAL, 'mail.js', `Failed to connect to server: ${err}`);
                }
            });
        }

        // Send if queue has messages
        if (this.messages.length > 0) {
            const message = this.messages.shift();
            this._send(message)
                .then((info) => {
                    ApplicationLogger.logBase(LogLevel.INFO, this.worker, null, null, 'mail/send', null, info);
                })
                .catch((error) => {
                    ApplicationLogger.logBase(LogLevel.FATAL, this.worker, null, null, 'mail/send', null, error);
                    this.messages.push(message);
                });
        }
    }

    /**
     * Helper function to send a message
     * @param  {Message} message Message to send
     * @return {Promise}         Info.
     */
    _send(message) {
        return new Promise((resolve, reject) => {
            this.transport.sendMail(message, function (err, info) {
                if (err) {
                    reject(err);
                } else {
                    resolve(info);
                }
            });
        });
    }

    /**
     * Add a message to queue
     * @param {string}      address     Email address.
     * @param {MessageType} messageType Type of message. Used to get subject and body.
     * @param {object}      dictionary  Content to add to the message.
     */
    add(address, messageType, dictionary) {
        dictionary.host = CONFIG.host;

        // Get message body
        var body;
        try {
            body = pug.renderFile(__dirname + '/' + Object.keys(MailType)[messageType] + '.pug', dictionary);
        } catch (error) {
            ApplicationLogger.logBase(LogLevel.FATAL, this.worker, null, null, 'mail/add', null, error);
            return;
        }

        // Create message
        const message = {
            from: CONFIG.mail.from,
            to: address,
            subject: MailSubject[messageType],
            html: body,
        };

        this.messages.push(message);
    }
}

exports.MailType = MailType;
exports.MailServer = MailServer;
