// middlewares/uploadReferenceImages.ts
import multer from "multer";
import type { Request } from "express";

const storage = multer.memoryStorage();

export const uploadReferenceImages = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req: Request, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
    if (!ok) return cb(null, false); // ✅ TS OK
    cb(null, true);
  },
}).array("reference_images", 2);
