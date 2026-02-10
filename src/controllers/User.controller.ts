import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";

//all thumbnails from user
export const getUserThumbnails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session;

    const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
    res.json({ thumbnails });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

//single thumbnail user

export const getThumbnailById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;

    const thumbnail = await Thumbnail.findOne({ userId, _id: id });

    if (!thumbnail) {
      return res.status(404).json({ message: "Thumbnail not found" });
    }

    return res.json({ thumbnail });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
