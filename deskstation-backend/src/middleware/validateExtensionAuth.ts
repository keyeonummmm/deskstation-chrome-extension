import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface ExtensionAuthPayload {
    user: {
        username: string;
        userId: number;
    };
    sessionId: string;
    isExtension: boolean;
    createdAt: number;
    userAgent: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                username: string;
                userId: number;
            };
        }
    }
}

const validateExtensionAuth = (req: Request, res: Response, next: NextFunction) => {
    const fullPath = req.originalUrl;
    
    // Allow the login and register endpoints without validation
    if (fullPath.includes('/api/user/login') || fullPath.includes('/api/user/register')) {
        return next();
    }

    const extensionAuth = req.query.extensionAuth as string;
    const sessionId = req.query.sessionId as string;
    
    if (!extensionAuth || !sessionId) {
        return res.status(403).json({ 
            message: 'Access denied. Please use the DeskStation extension to access this application.' 
        });
    }

    try {
        // Verify the JWT token and check for extension flag
        const decoded = jwt.verify(extensionAuth, process.env.JWT_SECRET as string) as ExtensionAuthPayload;
        
        // Validate extension token
        if (!decoded.isExtension) {
            throw new Error('Invalid extension token');
        }

        // Validate session ID matches
        if (decoded.sessionId !== sessionId) {
            throw new Error('Invalid session');
        }

        // Validate token age (optional, since JWT already handles expiration)
        const tokenAge = Date.now() - decoded.createdAt;
        if (tokenAge > 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
            throw new Error('Session expired');
        }

        // Add user info to request for later use if needed
        req.user = decoded.user;
        
        next();
    } catch (error) {
        return res.status(403).json({ 
            message: 'Invalid access token. Please login through the DeskStation extension.' 
        });
    }
};

export default validateExtensionAuth;