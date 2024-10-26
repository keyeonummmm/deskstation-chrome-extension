import File from '../models/file';
import Path from '../utils/path';
import {Request, Response} from 'express';
import logger from '../utils/logger';
import { monitorOperation, sanitizeInput, sanitizeFilePath } from '../utils/security';

interface AuthenticatedRequest extends Request {
    user: {
        username: string;
        userId: number;
    };
}

async function createFolder(req: AuthenticatedRequest, res: Response) {
    const {folderName, parentPath} = req.body;

    try {
        const sanitizedFolderName = sanitizeInput(folderName);
        const sanitizedParentPath = sanitizeFilePath(parentPath);

        const parent = new Path(sanitizedParentPath);

        if (!parent.isAbsolute()) {
            return res.status(400).json({ error: 'Parent path must be absolute' });
        }

        const newFolderPath = parent.join(sanitizedFolderName);

        const existingFolder = await File.findOne({ path: parent.toString(), name: sanitizedFolderName, type: 'folder' });
        if (existingFolder) {
            return res.status(409).json({ error: 'Folder with the same name already exists in this location' });
        }

        if (!parent.isRoot()) {
            const parentFolder = await File.findOne({ path: parent.toString(), type: 'folder' });
            if (!parentFolder) {
                return res.status(404).json({ error: 'Parent folder not found' });
            }
        }

        const newFolder = new File({
            name: sanitizedFolderName,
            path: newFolderPath.toString(),
            type: 'folder',
            author: req.user.username,
        });

        await newFolder.save();

        monitorOperation('createFolder', req.user.userId);
        logger.log('Folder created', { 
            userId: req.user.userId, 
            username: req.user.username, 
            folderPath: newFolderPath.toString() 
        });

        res.status(201).json(newFolder);
    } catch (error: unknown) {
        logger.log('Error creating folder', { 
            userId: req.user.userId, 
            username: req.user.username, 
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createNote(req: AuthenticatedRequest, res: Response) {
    const { noteName, parentPath, content } = req.body;

    try {
        const sanitizedNoteName = sanitizeInput(noteName);
        const sanitizedParentPath = sanitizeFilePath(parentPath);
        const sanitizedContent = sanitizeInput(content);

        const parent = new Path(sanitizedParentPath);

        if (!parent.isAbsolute()) {
            return res.status(400).json({ error: 'Parent path must be absolute' });
        }

        const newNotePath = parent.join(sanitizedNoteName);

        const existingNote = await File.findOne({ path: parent.toString(), name: sanitizedNoteName, type: 'note' });
        if (existingNote) {
            return res.status(409).json({ error: 'Note with the same name already exists in this location' });
        }

        const parentFolder = await File.findOne({ path: parent.toString(), type: 'folder' });
        if (!parentFolder) {
            return res.status(404).json({ error: 'Parent folder not found' });
        }

        const newNote = new File({
            name: sanitizedNoteName,
            path: newNotePath.toString(),
            type: 'note',
            content: sanitizedContent,
            author: req.user.username,
        });

        await newNote.save();

        monitorOperation('createNote', req.user.userId);
        logger.log('Note created', { 
            userId: req.user.userId, 
            username: req.user.username, 
            notePath: newNotePath.toString() 
        });

        res.status(201).json(newNote);
    } catch (error: unknown) {
        logger.log('Error creating note', { 
            userId: req.user.userId, 
            username: req.user.username, 
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function renameFile(req: AuthenticatedRequest, res: Response) {
    const { oldName, newName, parentPath } = req.body;

    try {
        const sanitizedOldName = sanitizeInput(oldName);
        const sanitizedNewName = sanitizeInput(newName);
        const sanitizedParentPath = sanitizeFilePath(parentPath);

        const parent = new Path(sanitizedParentPath);

        if (!parent.isAbsolute()) {
            return res.status(400).json({ error: 'Parent path must be absolute' });
        }

        const oldPath = parent.join(sanitizedOldName);
        const newPath = parent.join(sanitizedNewName);

        const existingItem = await File.findOne({ path: oldPath.toString() });

        if (!existingItem) {
            return res.status(404).json({ error: 'File or folder not found' });
        }

        if (existingItem.author !== req.user.username) {
            return res.status(403).json({ error: 'Only the author can rename this item' });
        }

        const conflictingItem = await File.findOne({ path: parent.toString(), name: sanitizedNewName });
        if (conflictingItem) {
            return res.status(409).json({ error: 'An item with the new name already exists in this location' });
        }

        existingItem.name = sanitizedNewName;
        existingItem.path = newPath.toString();

        if (existingItem.type === 'folder') {
            const nestedItems = await File.find({ path: { $regex: `^${oldPath.toString()}/` } });
            for (const item of nestedItems) {
                item.path = item.path.replace(oldPath.toString(), newPath.toString());
                await item.save();
            }
        }

        await existingItem.save();

        monitorOperation('renameFile', req.user.userId);
        logger.log('File renamed', { 
            userId: req.user.userId, 
            username: req.user.username, 
            oldPath: oldPath.toString(), 
            newPath: newPath.toString() 
        });

        res.status(200).json(existingItem);
    } catch (error) {
        console.error('Error in renameFolderAndNote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getFiles(req: AuthenticatedRequest, res: Response) {
    const { path } = req.query;

    if (typeof path !== 'string') {
        return res.status(400).json({ error: 'Invalid path parameter' });
    }

    try {
        const sanitizedPath = sanitizeFilePath(path);
        const currentPath = new Path(sanitizedPath);
        if (!currentPath.isAbsolute()) {
            return res.status(400).json({ error: 'Path must be absolute' });
        }

        const files = await File.find({
            $or: [
                { path: currentPath.toString() },
                { path: new RegExp(`^${currentPath.toString()}/[^/]+$`) }
            ]
        });

        res.status(200).json(files);
    } catch (error) {
        console.error('Error in getFiles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteNote(req: AuthenticatedRequest, res: Response) {
    const { path } = req.query;

    try {
        if (typeof path !== 'string') {
            return res.status(400).json({ error: 'Invalid path parameter' });
        }

        const sanitizedPath = sanitizeFilePath(path);
        const filePath = new Path(sanitizedPath);
        if (!filePath.isAbsolute()) {
            return res.status(400).json({ error: 'Path must be absolute' });
        }

        const existingFile = await File.findOne({ path: filePath.toString(), type: 'note' });
        if (!existingFile) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (existingFile.author !== req.user.username) {
            return res.status(403).json({ error: 'Only the author can delete this file' });
        }

        await existingFile.deleteOne();
        monitorOperation('deleteNote', req.user.userId);
        logger.log('Note deleted', { 
            userId: req.user.userId, 
            username: req.user.username, 
            notePath: filePath.toString() 
        });
        res.sendStatus(204);
    } catch (error: unknown) {
        console.error('Error in deleteFile:', error);
        logger.log('Error deleting note', { 
            userId: req.user.userId, 
            username: req.user.username, 
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteFolder(req: AuthenticatedRequest, res: Response) {
    const { path } = req.query;

    try {
        if (typeof path !== 'string') {
            return res.status(400).json({ error: 'Invalid path parameter' });
        }

        const sanitizedPath = sanitizeFilePath(path);
        const folderPath = new Path(sanitizedPath);
        if (!folderPath.isAbsolute()) {
            return res.status(400).json({ error: 'Path must be absolute' });
        }

        const existingFolder = await File.findOne({ path: folderPath.toString(), type: 'folder' });
        if (!existingFolder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        if (existingFolder.author !== req.user.username) {
            return res.status(403).json({ error: 'Only the author can delete this folder' });
        }

        const nestedItems = await File.find({ path: { $regex: `^${folderPath.toString()}/` } });
        if (nestedItems.length > 0) {
            return res.status(409).json({
                message: 'This folder contains items. Are you sure you want to delete it and all its contents?',
                requireConfirmation: true
            });
        }

        if (req.query.confirm === 'true') {
            await File.deleteMany({ 
                $or: [
                    { path: folderPath.toString() },
                    { path: { $regex: `^${folderPath.toString()}/` } }
                ]
            });
        } else {
            await existingFolder.deleteOne();
        }

        await existingFolder.deleteOne();
        res.sendStatus(204);
    } catch (error) {
        console.error('Error in deleteFolder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateNote(req: AuthenticatedRequest, res: Response) {
    const { path, content, message } = req.body;

    try {
        const sanitizedPath = sanitizeFilePath(path);
        const notePath = new Path(sanitizedPath);

        if (!notePath.isAbsolute()) {
            return res.status(400).json({ error: 'Path must be absolute' });
        }

        const existingNote = await File.findOne({ path: notePath.toString(), type: 'note' });

        if (!existingNote) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (existingNote.author === req.user.username) {
            existingNote.content = content;
            existingNote.updatedAt = new Date();
        } else if (message) {
            const newMessage = {
                content: message,
                author: req.user.username,
                date: new Date()
            };

            if (!existingNote.messages) {
                existingNote.messages = [];
            }
            existingNote.messages.push(newMessage);
        } else {
            return res.status(403).json({ error: 'Only the author can modify the original content' });
        }

        await existingNote.save();

        monitorOperation('updateNote', req.user.userId);
        logger.log('Note updated', { 
            userId: req.user.userId, 
            username: req.user.username, 
            notePath: notePath.toString() 
        });

        res.status(200).json(existingNote);
    } catch (error: unknown) {
        console.error('Error in updateNote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function countNotes(res: Response) {
    try {
        const count = await File.countDocuments({ type: 'note' });
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error in countNotes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export { 
        createFolder, 
        createNote, 
        updateNote,
        getFiles,
        renameFile,
        deleteNote,
        deleteFolder,
        countNotes,
};
