import { Request, Response, NextFunction } from 'express';
import logger from './logger';

interface OperationCount {
    [key: string]: {
        count: number;
        lastReset: number;
        blockedUntil?: number;
    };
}

const operationCounts: OperationCount = {};
const RESET_INTERVAL = 60000; // 1 minute
const MAX_OPERATIONS = 100; // Maximum operations per minute
const BLOCK_DURATION = 300000; // 5 minutes block

export function monitorOperation(operation: string, userId: number) {
    const key = `${operation}_${userId}`;
    const now = Date.now();

    if (!operationCounts[key] || now - operationCounts[key].lastReset > RESET_INTERVAL) {
        operationCounts[key] = { count: 1, lastReset: now };
    } else {
        operationCounts[key].count++;
    }

    if (operationCounts[key].count > MAX_OPERATIONS) {
        logger.log('Excessive operations detected', { operation, userId, count: operationCounts[key].count });
        operationCounts[key].blockedUntil = now + BLOCK_DURATION;
    }
}

export function sanitizeInput(input: string): string {
    return input.replace(/['";]/g, '').replace(/--/g, '');
}

export function escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = escapeHtml(req.body[key]);
            }
        });
    }
    next();
};

export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
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
                req.query[key] = sanitizeInput(req.query[key] as string);
            }
        });
    }
    next();
};

export function sanitizeFilePath(path: string): string {
    return path.replace(/[^a-zA-Z0-9\/\-_\.]/g, '').replace(/\.{2,}/g, '.');
}

export const rateLimit = (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.userId;
    const identifier = userId || req.ip || req.connection.remoteAddress;
    
    if (!identifier) {
        next();
        return;
    }

    handleRateLimit(identifier, req, res, next);
};

function handleRateLimit(identifier: string | number, req: Request, res: Response, next: NextFunction): void {
    const key = `api_${identifier}`;
    const now = Date.now();

    if (!operationCounts[key] || now - operationCounts[key].lastReset > RESET_INTERVAL) {
        operationCounts[key] = { count: 1, lastReset: now };
    } else {
        operationCounts[key].count++;
    }

    if (operationCounts[key].blockedUntil && now < operationCounts[key].blockedUntil) {
        const remainingTime = Math.ceil((operationCounts[key].blockedUntil! - now) / 1000);
        res.status(429).json({ 
            error: `Too many requests. Please try again after ${remainingTime} seconds.`,
            blockedUntil: operationCounts[key].blockedUntil
        });
        return;
    }

    if (operationCounts[key].count > MAX_OPERATIONS) {
        operationCounts[key].blockedUntil = now + BLOCK_DURATION;
        logger.log('Entity temporarily blocked due to rate limit', { identifier, count: operationCounts[key].count });
        res.status(429).json({ 
            error: `Too many requests. Please try again after ${BLOCK_DURATION / 1000} seconds.`,
            blockedUntil: operationCounts[key].blockedUntil
        });
        return;
    }

    next();
}
