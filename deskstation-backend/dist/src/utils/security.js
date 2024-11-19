"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = exports.sqlInjectionProtection = exports.xssProtection = void 0;
exports.monitorOperation = monitorOperation;
exports.sanitizeInput = sanitizeInput;
exports.escapeHtml = escapeHtml;
exports.sanitizeFilePath = sanitizeFilePath;
const logger_1 = __importDefault(require("./logger"));
const operationCounts = {};
const RESET_INTERVAL = 60000; // 1 minute
const MAX_OPERATIONS = 100; // Maximum operations per minute
const BLOCK_DURATION = 300000; // 5 minutes block
function monitorOperation(operation, userId) {
    const key = `${operation}_${userId}`;
    const now = Date.now();
    if (!operationCounts[key] || now - operationCounts[key].lastReset > RESET_INTERVAL) {
        operationCounts[key] = { count: 1, lastReset: now };
    }
    else {
        operationCounts[key].count++;
    }
    if (operationCounts[key].count > MAX_OPERATIONS) {
        logger_1.default.log('Excessive operations detected', { operation, userId, count: operationCounts[key].count });
        operationCounts[key].blockedUntil = now + BLOCK_DURATION;
    }
}
function sanitizeInput(input) {
    return input.replace(/['";]/g, '').replace(/--/g, '');
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
const xssProtection = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = escapeHtml(req.body[key]);
            }
        });
    }
    next();
};
exports.xssProtection = xssProtection;
const sqlInjectionProtection = (req, res, next) => {
    if (req.params) {
        Object.keys(req.params).forEach(key => {
            if (typeof req.params[key] === 'string') {
                req.params[key] = sanitizeInput(req.params[key]);
            }
        });
    }
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeInput(req.query[key]);
            }
        });
    }
    next();
};
exports.sqlInjectionProtection = sqlInjectionProtection;
function sanitizeFilePath(path) {
    return path.replace(/[^a-zA-Z0-9\/\-_\.]/g, '').replace(/\.{2,}/g, '.');
}
const rateLimit = (req, res, next) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const identifier = userId || req.ip || req.connection.remoteAddress;
    if (!identifier) {
        next();
        return;
    }
    handleRateLimit(identifier, req, res, next);
};
exports.rateLimit = rateLimit;
function handleRateLimit(identifier, req, res, next) {
    const key = `api_${identifier}`;
    const now = Date.now();
    if (!operationCounts[key] || now - operationCounts[key].lastReset > RESET_INTERVAL) {
        operationCounts[key] = { count: 1, lastReset: now };
    }
    else {
        operationCounts[key].count++;
    }
    if (operationCounts[key].blockedUntil && now < operationCounts[key].blockedUntil) {
        const remainingTime = Math.ceil((operationCounts[key].blockedUntil - now) / 1000);
        res.status(429).json({
            error: `Too many requests. Please try again after ${remainingTime} seconds.`,
            blockedUntil: operationCounts[key].blockedUntil
        });
        return;
    }
    if (operationCounts[key].count > MAX_OPERATIONS) {
        operationCounts[key].blockedUntil = now + BLOCK_DURATION;
        logger_1.default.log('Entity temporarily blocked due to rate limit', { identifier, count: operationCounts[key].count });
        res.status(429).json({
            error: `Too many requests. Please try again after ${BLOCK_DURATION / 1000} seconds.`,
            blockedUntil: operationCounts[key].blockedUntil
        });
        return;
    }
    next();
}
