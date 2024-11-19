"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getIntiForOneUser = getIntiForOneUser;
const user_1 = __importDefault(require("../models/user"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const security_1 = require("../utils/security");
function register(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required' });
            }
            const sanitizedUsername = (0, security_1.sanitizeInput)(username);
            const sanitizedPassword = (0, security_1.sanitizeInput)(password);
            const crypto = require('crypto');
            const hashedUsername = crypto.createHash('sha256').update(sanitizedUsername).digest('hex');
            const existingUser = yield user_1.default.findOne({ username: hashedUsername });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            const createdAt = new Date();
            const latestUser = yield user_1.default.findOne().sort({ userId: -1 });
            const userId = latestUser ? latestUser.userId + 1 : 1;
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = crypto.pbkdf2Sync(sanitizedPassword, salt, 1000, 64, 'sha512').toString('hex');
            const user = new user_1.default({
                username: hashedUsername,
                password: `${salt}:${hashedPassword}`,
                userId,
                createdAt
            });
            yield user.save();
            (0, security_1.monitorOperation)('register', userId);
            logger_1.default.log('User registered', { userId: user.userId, username: sanitizedUsername });
            const userResponse = {
                userId: user.userId,
                username: sanitizedUsername,
                createdAt: user.createdAt
            };
            res.status(201).json({ user: userResponse, message: 'User registered successfully' });
        }
        catch (error) {
            console.error('Registration error:', error);
            logger_1.default.log('Registration error', {
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ message: 'An error occurred during registration' });
        }
    });
}
function login(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        try {
            const sanitizedUsername = (0, security_1.sanitizeInput)(username);
            const sanitizedPassword = (0, security_1.sanitizeInput)(password);
            const crypto = require('crypto');
            const hashedUsername = crypto.createHash('sha256').update(sanitizedUsername).digest('hex');
            const user = yield user_1.default.findOne({
                username: hashedUsername,
            });
            if (!user) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }
            const [salt, storedHash] = user.password.split(':');
            const hashedPassword = crypto.pbkdf2Sync(sanitizedPassword, salt, 1000, 64, 'sha512').toString('hex');
            const isMatch = storedHash === hashedPassword;
            if (isMatch) {
                const token = jsonwebtoken_1.default.sign({ user: { username: user.username, userId: user.userId } }, process.env.JWT_SECRET, { expiresIn: '24h' });
                (0, security_1.monitorOperation)('login', user.userId);
                logger_1.default.log('User logged in', { userId: user.userId, username: sanitizedUsername });
                res.status(200).json({ message: 'Login successful', token });
            }
            else {
                logger_1.default.log('Failed login attempt', { username: sanitizedUsername });
                res.status(401).json({ message: 'Invalid username or password' });
            }
        }
        catch (error) {
            console.error('Login error:', error);
            logger_1.default.log('Login error', {
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ message: 'An error occurred during login' });
        }
    });
}
function getIntiForOneUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sanitizedUsername = (0, security_1.sanitizeInput)(req.body.username);
            const user = yield user_1.default.findOne({ username: sanitizedUsername });
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            res.status(200).json(user);
        }
        catch (error) {
            console.error('Error getting user info:', error);
            logger_1.default.log('Error getting user info', {
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ message: 'An error occurred while fetching user information' });
        }
    });
}
