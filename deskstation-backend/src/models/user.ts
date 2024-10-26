import mongoose, {Schema, Document} from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    userId: number;
    createdAt: Date;
}

const userSchema: Schema = new Schema(
    {
        username: {type: String, required: true},
        password: {type: String, required: true},
        userId: {type: Number, required: true},
        createdAt: {type: Date, default: Date.now},
    },
    {timestamps: true}
);

export default mongoose.model<IUser>('User', userSchema);