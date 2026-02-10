import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";

export const getCommunityThumbnails = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limitRaw = parseInt(String(req.query.limit || "24"), 10) || 24;
    const limit = Math.min(Math.max(limitRaw, 1), 60);
    const skip = (page - 1) * limit;

    const { style, aspect_ratio, color_scheme, text_overlay, q } = req.query;

    const filter: any = {
      isPublic: true,
      isGenerating: false,
      image_url: { $exists: true, $ne: null },
    };

    if (style) filter.style = style;
    if (aspect_ratio) filter.aspect_ratio = aspect_ratio;
    if (color_scheme) filter.color_scheme = color_scheme;
    if (typeof text_overlay !== "undefined") {
      // acepta "true"/"false"
      filter.text_overlay = String(text_overlay) === "true";
    }
    if (q && String(q).trim()) {
      filter.title = { $regex: String(q).trim(), $options: "i" };
    }

    const [items, total] = await Promise.all([
      Thumbnail.find(filter)
        .select("_id title image_url style aspect_ratio color_scheme text_overlay createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Thumbnail.countDocuments(filter),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      thumbnails: items,
    });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

export const getCommunityThumbnailById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const thumbnail = await Thumbnail.findOne({
      _id: id,
      isPublic: true,
      isGenerating: false,
      image_url: { $exists: true, $ne: null },
    })
      .select("_id title image_url style aspect_ratio color_scheme text_overlay createdAt")
      .lean();

    if (!thumbnail) {
      return res.status(404).json({ message: "Thumbnail not found" });
    }

    return res.json({ thumbnail });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

// Toggle de “compartir en comunidad” (solo dueño)
export const setThumbnailPublic = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;
    const { isPublic } = req.body as { isPublic: boolean };

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be boolean" });
    }

    const updated = await Thumbnail.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isPublic } },
      { new: true }
    ).select("_id isPublic");

    if (!updated) {
      return res.status(404).json({ message: "Thumbnail not found" });
    }

    return res.json({ message: "Visibility updated", thumbnail: updated });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
