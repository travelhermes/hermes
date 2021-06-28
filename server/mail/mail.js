/* jshint esversion: 8 */
const cluster = require('cluster');
const { ApplicationLogger, LogLevel } = require('../logger/logger.js');
const nodemailer = require('nodemailer');
const fs = require('fs');
const Handlebars = require('handlebars');
const { Localization } = require('../localization/index.js');

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

class MailServer {
    constructor(auth = {}, service = null, worker = 0) {
        this.auth = auth;
        this.service = service;
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
            this.transport = nodemailer.createTransport({
                service: this.service,
                auth: this.auth,
            });

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
     * @param {object}      lang        Language of the email to send.
     */
    add(address, messageType, dictionary, lang = 'en') {
        dictionary.host = process.env.SERVER_HOST;

        // Get message body
        var body;
        const templateName = Object.keys(MailType)[messageType] + '.html';
        const templatePath = __dirname + '/templates/' + lang + '/' + templateName;
        try {
            body = fs.readFileSync(templatePath, 'utf-8');
            body = Handlebars.compile(body)(dictionary);
        } catch (error) {
            ApplicationLogger.logBase(LogLevel.FATAL, this.worker, null, null, 'mail/add', null, error);
            return;
        }

        // Create message
        const message = {
            from: process.env.MAIL_FROM,
            to: address,
            subject: Localization.getString('mail' + Object.keys(MailType)[messageType], lang),
            html: body,
        };

        this.messages.push(message);
    }
}

exports.MailType = MailType;
exports.MailServer = MailServer;
