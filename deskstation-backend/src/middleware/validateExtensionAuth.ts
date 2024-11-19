import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const validateExtensionAuth = (req: Request, res: Response, next: NextFunction) => {
    // Get the full URL path
    const fullPath = req.originalUrl;
    
    // Allow the login and register endpoints without validation
    if (fullPath.includes('/api/user/login') || fullPath.includes('/api/user/register')) {
        return next();
    }

    const extensionAuth = req.query.extensionAuth as string;
    
    // Reject if no extension auth token
    if (!extensionAuth) {
        return res.status(403).json({ 
            message: 'Access denied. Please use the DeskStation extension to access this application.' 
        });
    }

    try {
        // Verify the JWT token
        jwt.verify(extensionAuth, process.env.JWT_SECRET as string);
        next();
    } catch (error) {
        return res.status(403).json({ 
            message: 'Invalid access token. Please login through the DeskStation extension.' 
        });
    }
};

export default validateExtensionAuth;