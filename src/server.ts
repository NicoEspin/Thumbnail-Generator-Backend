import express, { Request, Response } from 'express';
import cors from "cors"
import "dotenv/config"
import connectDB from './config/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import AuthRouter from './routes/Auth.routes.js';
import ThumbnailRouter from './routes/Thumbnail.routes.js';
import UserRouter from './routes/User.routes.js';

declare module "express-session"{
    interface SessionData{
        isloggedIn: boolean;
        userId:string;
    }
}

await connectDB();

const app = express();

const port = process.env.PORT || 3000;

app.use(session({
    secret:process.env.SESSION_SECRET as string,
    resave:false,
    saveUninitialized:false,
    cookie:{maxAge:1000*60*60*24 * 7}, // 1 week
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI as string,
        collectionName:"sessions"
    })
}))

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
}))
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use("/api/auth", AuthRouter)

app.use("/api/thumbnail", ThumbnailRouter);

app.use("/api/user", UserRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});