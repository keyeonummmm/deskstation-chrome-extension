import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
    name: string;
    path: string;
    type: 'folder' | 'note';
    content?: string;
    messages?: {
        content: string;
        author: string;
        date: Date;
    }[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
}

const fileSchema: Schema = new Schema(
{
    name: { type: String, required: true },
    path: { type: String, required: true },
    type: { type: String, enum: ['folder', 'note'], required: true },
    content: { type: String, required: function(this: IFile) { return this.type === 'note'; } },
    messages: { type: Array, required: function(this: IFile) { return this.type === 'note'; } },
    author: { type: Schema.Types.String, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model<IFile>('File', fileSchema);