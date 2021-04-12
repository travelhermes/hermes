/* jshint esversion: 8 */
const { spawn } = require('child_process');

exports.Process = class Process {
    constructor(command, args = []) {
        this.command = command;
        this.args = args;
        this.stdout = '';
        this.stderr = '';
        this.proc = null;
        this.timeout = null;
    }

    run() {
        return new Promise((resolve, reject) => {
            try {
                this.proc = spawn(this.command, this.args);
            } catch (err) {
                reject(err);
                return;
            }

            this.proc.stdout.on('data', (data) => {
                this.stdout += data;
            });
            this.proc.stderr.on('data', (data) => {
                this.stderr += data;
            });

            this.proc.on('exit', (code) => {
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }

                if (code == 0) {
                    resolve(this.stdout);
                } else {
                    reject({
                        code: code,
                        stderr: this.stderr,
                    });
                    return;
                }
            });
        });
    }

    runWithTimeout(seconds) {
        return new Promise((resolve, reject) => {
            this.run()
                .then(resolve)
                .catch((err) => {
                    clearTimeout(this.timeout);
                    reject(err);
                });
            this.timeout = setTimeout(function () {
                this.proc.kill();
                reject({
                    code: -1,
                });
            }, seconds * 1000);
        });
    }
};
