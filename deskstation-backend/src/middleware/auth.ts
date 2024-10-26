import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import user from '../models/user';

interface AuthenticatedRequest extends Request {
    user?: {
        username: string;
        userId: number;
    };
}

export default function auth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header provided' });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
        return res.status(401).json({ message: 'Invalid authorization header format' });
    }
    const token = parts[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { user: { username: string; userId: number } };
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }
        req.user = decoded.user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}