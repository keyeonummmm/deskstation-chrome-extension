import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRouters from './routes/api';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import logger from './utils/logger';
import { xssProtection, sqlInjectionProtection, rateLimit } from './utils/security';
import validateExtensionAuth from './middleware/validateExtensionAuth';
dotenv.config();

const app = express();
const MONGODB_URI = process.env.MONGODB_URI as string;

app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(xssProtection);
app.use(sqlInjectionProtection);

const allowedOrigins = [
    'http://localhost:3000',
    'chrome-extension://' + process.env.CHROME_EXTENSION_ID
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

app.get('/', validateExtensionAuth as express.RequestHandler, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'web_app/public/index.html'));
});

app.use('/api', rateLimit, apiRouters);

app.use('/', express.static(path.join(__dirname, '..', '..', 'web_app/public')));

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'web_app/public/index.html'));
});

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

connectDB()
    .then(() => {
        const port = process.env.PORT || 3000;
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        process.on('SIGTERM', async () => {
            server.close(() => {
                mongoose.connection.close();
                process.exit(0);
            });
        });

        if (!process.env.MONGODB_URI) {
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Error starting the server:', err);
        process.exit(1);
    });

process.on('unhandledRejection', (reason: unknown, promise: unknown) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logger.log('Unhandled Rejection', { 
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise)
    });
    process.exit(1);
});
