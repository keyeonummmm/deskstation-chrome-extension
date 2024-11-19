"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Logger {
    constructor() {
        this.logFile = path_1.default.join(__dirname, '..', '..', 'logs', 'security.log');
        this.ensureLogDirectoryExists();
    }
    ensureLogDirectoryExists() {
        const dir = path_1.default.dirname(this.logFile);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
    log(message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${message} - ${this.safeStringify(data)}\n`;
        fs_1.default.appendFile(this.logFile, logEntry, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }
    safeStringify(obj) {
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
exports.default = new Logger();
