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
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const api_1 = __importDefault(require("./routes/api"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./utils/logger"));
const security_1 = require("./utils/security");
dotenv_1.default.config();
const app = (0, express_1.default)();
const MONGODB_URI = process.env.MONGODB_URI;
app.use(body_parser_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use(security_1.xssProtection);
app.use(security_1.sqlInjectionProtection);
const allowedOrigins = [
    'http://localhost:3000',
    'chrome-extension://' + process.env.CHROME_EXTENSION_ID
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use('/api', security_1.rateLimit, api_1.default);
app.use('/', express_1.default.static(path_1.default.join(__dirname, '..', '..', 'web_app/public')));
app.get('/*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', '..', 'web_app/public/index.html'));
});
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
});
connectDB()
    .then(() => {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
        server.close(() => {
            mongoose_1.default.connection.close();
            process.exit(0);
        });
    }));
    if (!process.env.MONGODB_URI) {
        process.exit(1);
    }
})
    .catch(err => {
    console.error('Error starting the server:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logger_1.default.log('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise)
    });
    process.exit(1);
});
