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
exports.createFolder = createFolder;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.getFiles = getFiles;
exports.renameFile = renameFile;
exports.deleteNote = deleteNote;
exports.deleteFolder = deleteFolder;
exports.countNotes = countNotes;
const file_1 = __importDefault(require("../models/file"));
const path_1 = __importDefault(require("../utils/path"));
const logger_1 = __importDefault(require("../utils/logger"));
const security_1 = require("../utils/security");
function createFolder(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { folderName, parentPath } = req.body;
        try {
            const sanitizedFolderName = (0, security_1.sanitizeInput)(folderName);
            const sanitizedParentPath = (0, security_1.sanitizeFilePath)(parentPath);
            const parent = new path_1.default(sanitizedParentPath);
            if (!parent.isAbsolute()) {
                return res.status(400).json({ error: 'Parent path must be absolute' });
            }
            const newFolderPath = parent.join(sanitizedFolderName);
            const existingFolder = yield file_1.default.findOne({ path: parent.toString(), name: sanitizedFolderName, type: 'folder' });
            if (existingFolder) {
                return res.status(409).json({ error: 'Folder with the same name already exists in this location' });
            }
            if (!parent.isRoot()) {
                const parentFolder = yield file_1.default.findOne({ path: parent.toString(), type: 'folder' });
                if (!parentFolder) {
                    return res.status(404).json({ error: 'Parent folder not found' });
                }
            }
            const newFolder = new file_1.default({
                name: sanitizedFolderName,
                path: newFolderPath.toString(),
                type: 'folder',
                author: req.user.username,
            });
            yield newFolder.save();
            (0, security_1.monitorOperation)('createFolder', req.user.userId);
            logger_1.default.log('Folder created', {
                userId: req.user.userId,
                username: req.user.username,
                folderPath: newFolderPath.toString()
            });
            res.status(201).json(newFolder);
        }
        catch (error) {
            logger_1.default.log('Error creating folder', {
                userId: req.user.userId,
                username: req.user.username,
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function createNote(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { noteName, parentPath, content } = req.body;
        try {
            const sanitizedNoteName = (0, security_1.sanitizeInput)(noteName);
            const sanitizedParentPath = (0, security_1.sanitizeFilePath)(parentPath);
            const sanitizedContent = (0, security_1.sanitizeInput)(content);
            const parent = new path_1.default(sanitizedParentPath);
            if (!parent.isAbsolute()) {
                return res.status(400).json({ error: 'Parent path must be absolute' });
            }
            const newNotePath = parent.join(sanitizedNoteName);
            const existingNote = yield file_1.default.findOne({ path: parent.toString(), name: sanitizedNoteName, type: 'note' });
            if (existingNote) {
                return res.status(409).json({ error: 'Note with the same name already exists in this location' });
            }
            const parentFolder = yield file_1.default.findOne({ path: parent.toString(), type: 'folder' });
            if (!parentFolder) {
                return res.status(404).json({ error: 'Parent folder not found' });
            }
            const newNote = new file_1.default({
                name: sanitizedNoteName,
                path: newNotePath.toString(),
                type: 'note',
                content: sanitizedContent,
                author: req.user.username,
            });
            yield newNote.save();
            (0, security_1.monitorOperation)('createNote', req.user.userId);
            logger_1.default.log('Note created', {
                userId: req.user.userId,
                username: req.user.username,
                notePath: newNotePath.toString()
            });
            res.status(201).json(newNote);
        }
        catch (error) {
            logger_1.default.log('Error creating note', {
                userId: req.user.userId,
                username: req.user.username,
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function renameFile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { oldName, newName, parentPath } = req.body;
        try {
            const sanitizedOldName = (0, security_1.sanitizeInput)(oldName);
            const sanitizedNewName = (0, security_1.sanitizeInput)(newName);
            const sanitizedParentPath = (0, security_1.sanitizeFilePath)(parentPath);
            const parent = new path_1.default(sanitizedParentPath);
            if (!parent.isAbsolute()) {
                return res.status(400).json({ error: 'Parent path must be absolute' });
            }
            const oldPath = parent.join(sanitizedOldName);
            const newPath = parent.join(sanitizedNewName);
            const existingItem = yield file_1.default.findOne({ path: oldPath.toString() });
            if (!existingItem) {
                return res.status(404).json({ error: 'File or folder not found' });
            }
            if (existingItem.author !== req.user.username) {
                return res.status(403).json({ error: 'Only the author can rename this item' });
            }
            const conflictingItem = yield file_1.default.findOne({ path: parent.toString(), name: sanitizedNewName });
            if (conflictingItem) {
                return res.status(409).json({ error: 'An item with the new name already exists in this location' });
            }
            existingItem.name = sanitizedNewName;
            existingItem.path = newPath.toString();
            if (existingItem.type === 'folder') {
                const nestedItems = yield file_1.default.find({ path: { $regex: `^${oldPath.toString()}/` } });
                for (const item of nestedItems) {
                    item.path = item.path.replace(oldPath.toString(), newPath.toString());
                    yield item.save();
                }
            }
            yield existingItem.save();
            (0, security_1.monitorOperation)('renameFile', req.user.userId);
            logger_1.default.log('File renamed', {
                userId: req.user.userId,
                username: req.user.username,
                oldPath: oldPath.toString(),
                newPath: newPath.toString()
            });
            res.status(200).json(existingItem);
        }
        catch (error) {
            console.error('Error in renameFolderAndNote:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function getFiles(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { path } = req.query;
        if (typeof path !== 'string') {
            return res.status(400).json({ error: 'Invalid path parameter' });
        }
        try {
            const sanitizedPath = (0, security_1.sanitizeFilePath)(path);
            const currentPath = new path_1.default(sanitizedPath);
            if (!currentPath.isAbsolute()) {
                return res.status(400).json({ error: 'Path must be absolute' });
            }
            const files = yield file_1.default.find({
                $or: [
                    { path: currentPath.toString() },
                    { path: new RegExp(`^${currentPath.toString()}/[^/]+$`) }
                ]
            });
            res.status(200).json(files);
        }
        catch (error) {
            console.error('Error in getFiles:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function deleteNote(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { path } = req.query;
        try {
            if (typeof path !== 'string') {
                return res.status(400).json({ error: 'Invalid path parameter' });
            }
            const sanitizedPath = (0, security_1.sanitizeFilePath)(path);
            const filePath = new path_1.default(sanitizedPath);
            if (!filePath.isAbsolute()) {
                return res.status(400).json({ error: 'Path must be absolute' });
            }
            const existingFile = yield file_1.default.findOne({ path: filePath.toString(), type: 'note' });
            if (!existingFile) {
                return res.status(404).json({ error: 'File not found' });
            }
            if (existingFile.author !== req.user.username) {
                return res.status(403).json({ error: 'Only the author can delete this file' });
            }
            yield existingFile.deleteOne();
            (0, security_1.monitorOperation)('deleteNote', req.user.userId);
            logger_1.default.log('Note deleted', {
                userId: req.user.userId,
                username: req.user.username,
                notePath: filePath.toString()
            });
            res.sendStatus(204);
        }
        catch (error) {
            console.error('Error in deleteFile:', error);
            logger_1.default.log('Error deleting note', {
                userId: req.user.userId,
                username: req.user.username,
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function deleteFolder(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { path } = req.query;
        try {
            if (typeof path !== 'string') {
                return res.status(400).json({ error: 'Invalid path parameter' });
            }
            const sanitizedPath = (0, security_1.sanitizeFilePath)(path);
            const folderPath = new path_1.default(sanitizedPath);
            if (!folderPath.isAbsolute()) {
                return res.status(400).json({ error: 'Path must be absolute' });
            }
            const existingFolder = yield file_1.default.findOne({ path: folderPath.toString(), type: 'folder' });
            if (!existingFolder) {
                return res.status(404).json({ error: 'Folder not found' });
            }
            if (existingFolder.author !== req.user.username) {
                return res.status(403).json({ error: 'Only the author can delete this folder' });
            }
            const nestedItems = yield file_1.default.find({ path: { $regex: `^${folderPath.toString()}/` } });
            if (nestedItems.length > 0) {
                return res.status(409).json({
                    message: 'This folder contains items. Are you sure you want to delete it and all its contents?',
                    requireConfirmation: true
                });
            }
            if (req.query.confirm === 'true') {
                yield file_1.default.deleteMany({
                    $or: [
                        { path: folderPath.toString() },
                        { path: { $regex: `^${folderPath.toString()}/` } }
                    ]
                });
            }
            else {
                yield existingFolder.deleteOne();
            }
            yield existingFolder.deleteOne();
            res.sendStatus(204);
        }
        catch (error) {
            console.error('Error in deleteFolder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function updateNote(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { path, content, message } = req.body;
        try {
            const sanitizedPath = (0, security_1.sanitizeFilePath)(path);
            const notePath = new path_1.default(sanitizedPath);
            if (!notePath.isAbsolute()) {
                return res.status(400).json({ error: 'Path must be absolute' });
            }
            const existingNote = yield file_1.default.findOne({ path: notePath.toString(), type: 'note' });
            if (!existingNote) {
                return res.status(404).json({ error: 'Note not found' });
            }
            if (existingNote.author === req.user.username) {
                existingNote.content = content;
                existingNote.updatedAt = new Date();
            }
            else if (message) {
                const newMessage = {
                    content: message,
                    author: req.user.username,
                    date: new Date()
                };
                if (!existingNote.messages) {
                    existingNote.messages = [];
                }
                existingNote.messages.push(newMessage);
            }
            else {
                return res.status(403).json({ error: 'Only the author can modify the original content' });
            }
            yield existingNote.save();
            (0, security_1.monitorOperation)('updateNote', req.user.userId);
            logger_1.default.log('Note updated', {
                userId: req.user.userId,
                username: req.user.username,
                notePath: notePath.toString()
            });
            res.status(200).json(existingNote);
        }
        catch (error) {
            console.error('Error in updateNote:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function countNotes(res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const count = yield file_1.default.countDocuments({ type: 'note' });
            res.status(200).json({ count });
        }
        catch (error) {
            console.error('Error in countNotes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
