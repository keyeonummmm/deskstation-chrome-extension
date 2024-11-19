"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController = __importStar(require("../controllers/userController"));
const fileController = __importStar(require("../controllers/fileController"));
const auth_1 = __importDefault(require("../middleware/auth"));
const apiRouter = express_1.default.Router();
// User routes
const userRouter = express_1.default.Router();
// Public user routes
userRouter.post('/register', userController.register);
userRouter.post('/login', userController.login);
// Protected user routes
userRouter.get('/info', auth_1.default, userController.getIntiForOneUser);
// File routes
const fileRouter = express_1.default.Router();
// All file routes are protected
fileRouter.use(auth_1.default);
fileRouter.post('/folder', fileController.createFolder);
fileRouter.post('/note', fileController.createNote);
fileRouter.put('/rename', fileController.renameFile);
fileRouter.get('/list', fileController.getFiles);
fileRouter.delete('/note', fileController.deleteNote);
fileRouter.delete('/folder', fileController.deleteFolder);
fileRouter.put('/note', fileController.updateNote);
fileRouter.get('/count-notes', (req, res) => fileController.countNotes(res));
// Attach routers to main API router
apiRouter.use('/user', userRouter);
apiRouter.use('/file', fileRouter);
exports.default = apiRouter;
