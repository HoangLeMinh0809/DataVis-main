/**
 * Logger utility với màu sắc và ghi file
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.logDir = path.resolve(__dirname, '..', 'logs');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    getLogFileName() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `crawler-${date}.log`);
    }

    formatMessage(level, message) {
        return `[${this.getTimestamp()}] [${level}] [${this.context}] ${message}`;
    }

    writeToFile(formattedMessage) {
        try {
            fs.appendFileSync(this.getLogFileName(), formattedMessage + '\n');
        } catch (error) {
            console.error('Không thể ghi log:', error.message);
        }
    }

    info(message) {
        const formatted = this.formatMessage('INFO', message);
        console.log(`\x1b[36m${formatted}\x1b[0m`); // Cyan
        this.writeToFile(formatted);
    }

    warn(message) {
        const formatted = this.formatMessage('WARN', message);
        console.log(`\x1b[33m${formatted}\x1b[0m`); // Yellow
        this.writeToFile(formatted);
    }

    error(message) {
        const formatted = this.formatMessage('ERROR', message);
        console.log(`\x1b[31m${formatted}\x1b[0m`); // Red
        this.writeToFile(formatted);
    }

    success(message) {
        const formatted = this.formatMessage('SUCCESS', message);
        console.log(`\x1b[32m${formatted}\x1b[0m`); // Green
        this.writeToFile(formatted);
    }

    debug(message) {
        if (process.env.DEBUG === 'true') {
            const formatted = this.formatMessage('DEBUG', message);
            console.log(`\x1b[35m${formatted}\x1b[0m`); // Magenta
            this.writeToFile(formatted);
        }
    }
}

module.exports = Logger;
