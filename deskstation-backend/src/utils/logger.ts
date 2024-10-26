import fs from 'fs';
import path from 'path';

class Logger {
    private logFile: string;

    constructor() {
        this.logFile = path.join(__dirname, '..', '..', 'logs', 'security.log');
        this.ensureLogDirectoryExists();
    }

    private ensureLogDirectoryExists() {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    public log(message: string, data: unknown) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${message} - ${this.safeStringify(data)}\n`;

        fs.appendFile(this.logFile, logEntry, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }

    private safeStringify(obj: unknown): string {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    return '[Circular]';
                }
                cache.add(value);
            }
            return value;
        });
    }
}

export default new Logger();
