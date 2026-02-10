import express from "express";
import { deleteThumbnail, generateThumbnail } from "../controllers/Thumbnail.controller.js";
import protect from "../middlewares/auth.js";
import { uploadReferenceImages } from "../middlewares/uploadReferenceImages.js";

import {
  getCommunityThumbnails,
  getCommunityThumbnailById,
  setThumbnailPublic,
} from "../controllers/Community.controller.js";

const ThumbnailRouter = express.Router();

// ✅ multipart/form-data con hasta 2 imágenes
ThumbnailRouter.post("/generate", protect, uploadReferenceImages, generateThumbnail);

ThumbnailRouter.delete("/:id", protect, deleteThumbnail);

// ✅ Comunidad (público)
ThumbnailRouter.get("/community", getCommunityThumbnails);
ThumbnailRouter.get("/community/:id", getCommunityThumbnailById);

// ✅ Share/unshare (solo dueño)
ThumbnailRouter.patch("/:id/visibility", protect, setThumbnailPublic);

export default ThumbnailRouter;
