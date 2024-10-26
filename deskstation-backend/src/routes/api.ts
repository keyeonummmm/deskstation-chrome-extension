import express, { Request, Response } from 'express';
import * as userController from '../controllers/userController';
import * as fileController from '../controllers/fileController';
import auth from '../middleware/auth';

const apiRouter = express.Router();

// User routes
const userRouter = express.Router();

// Public user routes
userRouter.post('/register', userController.register as any);
userRouter.post('/login', userController.login as any);

// Protected user routes
userRouter.get('/info', auth as express.RequestHandler, userController.getIntiForOneUser as any);

// File routes
const fileRouter = express.Router();

// All file routes are protected
fileRouter.use(auth as express.RequestHandler);

fileRouter.post('/folder', fileController.createFolder as any);
fileRouter.post('/note', fileController.createNote as any);
fileRouter.put('/rename', fileController.renameFile as any);
fileRouter.get('/list', fileController.getFiles as any);
fileRouter.delete('/note', fileController.deleteNote as any);
fileRouter.delete('/folder', fileController.deleteFolder as any);
fileRouter.put('/note', fileController.updateNote as any);
fileRouter.get('/count-notes', (req: Request, res: Response) => fileController.countNotes(res));

// Attach routers to main API router
apiRouter.use('/user', userRouter);
apiRouter.use('/file', fileRouter);

export default apiRouter;
