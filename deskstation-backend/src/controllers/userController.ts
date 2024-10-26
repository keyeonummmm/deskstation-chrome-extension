import User from '../models/user';
import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { monitorOperation, sanitizeInput, escapeHtml } from '../utils/security';

async function register(req: Request, res: Response) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const sanitizedUsername = sanitizeInput(username);
        const sanitizedPassword = sanitizeInput(password);
        
        const crypto = require('crypto');
        const hashedUsername = crypto.createHash('sha256').update(sanitizedUsername).digest('hex');
        
        const existingUser = await User.findOne({ username: hashedUsername });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        const createdAt = new Date();
        const latestUser = await User.findOne().sort({ userId: -1 });
        const userId = latestUser ? latestUser.userId + 1 : 1;
        
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.pbkdf2Sync(sanitizedPassword, salt, 1000, 64, 'sha512').toString('hex');
        
        const user = new User({
            username: hashedUsername,
            password: `${salt}:${hashedPassword}`,
            userId,
            createdAt
        });
        
        await user.save();
        
        monitorOperation('register', userId);
        logger.log('User registered', { userId: user.userId, username: sanitizedUsername });
        
        const userResponse = {
            userId: user.userId,
            username: sanitizedUsername,
            createdAt: user.createdAt
        };
        
        res.status(201).json({ user: userResponse, message: 'User registered successfully' });
    } catch (error: unknown) {
        console.error('Registration error:', error);
        logger.log('Registration error', { 
            error: error instanceof Error ? error.message : String(error) 
        });
        res.status(500).json({ message: 'An error occurred during registration' });
    }
}

async function login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        const sanitizedUsername = sanitizeInput(username);
        const sanitizedPassword = sanitizeInput(password);

        const crypto = require('crypto');
        const hashedUsername = crypto.createHash('sha256').update(sanitizedUsername).digest('hex');
        const user = await User.findOne({
            username: hashedUsername,
        });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const [salt, storedHash] = user.password.split(':');
        const hashedPassword = crypto.pbkdf2Sync(sanitizedPassword, salt, 1000, 64, 'sha512').toString('hex');
        const isMatch = storedHash === hashedPassword;
        if (isMatch) {
            const token = jwt.sign({ user: { username: user.username, userId: user.userId } }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
            monitorOperation('login', user.userId);
            logger.log('User logged in', { userId: user.userId, username: sanitizedUsername });
            res.status(200).json({ message: 'Login successful', token });
        } else {
            logger.log('Failed login attempt', { username: sanitizedUsername });
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error: unknown) {
        console.error('Login error:', error);
        logger.log('Login error', { 
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ message: 'An error occurred during login' });
    }
}

async function getIntiForOneUser(req: Request, res: Response) {
    try {
        const sanitizedUsername = sanitizeInput(req.body.username);
        const user = await User.findOne({ username: sanitizedUsername });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error: unknown) {
        console.error('Error getting user info:', error);
        logger.log('Error getting user info', { 
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ message: 'An error occurred while fetching user information' });
    }
}

export {
    register,
    login,
    getIntiForOneUser,
};
