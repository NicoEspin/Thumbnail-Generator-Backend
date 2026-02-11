import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import session from "express-session";
import { MongoStore } from "connect-mongo";
import AuthRouter from "./routes/Auth.routes.js";
import ThumbnailRouter from "./routes/Thumbnail.routes.js";
import UserRouter from "./routes/User.routes.js";

declare module "express-session" {
  interface SessionData {
    isloggedIn: boolean;
    userId: string;
  }
}

await connectDB();

const app = express();

// ✅ necesario en Vercel / proxies para cookies secure
app.set("trust proxy", 1);

const port = process.env.PORT || 3000;

// ✅ en Vercel a veces NODE_ENV no viene como "production"
const isProd =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://thumblify-chi-henna.vercel.app",
];

// ✅ CORS antes de session (para que Set-Cookie salga con headers correctos)
app.use(
  cors({
    origin: (origin, cb) => {
      // permitir requests sin origin (postman, server-to-server)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());

// ✅ session cookie cross-site (frontend y backend en dominios distintos)
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,

    // ✅ importante detrás de proxy (Vercel)
    proxy: true,

    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: isProd ? "none" : "lax",
      secure: isProd, // requerido si sameSite = "none"
    },

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI as string,
      collectionName: "sessions",
    }),
  }),
);

app.get("/", (_req: Request, res: Response) => {
  res.send("Server is Live!");
});

app.use("/api/auth", AuthRouter);
app.use("/api/thumbnail", ThumbnailRouter);
app.use("/api/user", UserRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
