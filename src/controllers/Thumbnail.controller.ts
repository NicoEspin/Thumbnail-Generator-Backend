import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import {
  GenerateContentConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import ai from "../config/ai.js";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

/**
 * Multer agrega req.files cuando usás uploadReferenceImages (array("reference_images", 2))
 */
type MulterRequest = Request & { files?: Express.Multer.File[] };

const stylePrompts = {
  "Bold & Graphic":
    "eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style",
  "Tech/Futuristic":
    "futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere",
  Minimalist:
    "minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point",
  Photorealistic:
    "photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field",
  Illustrated:
    "illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style",
} as const;

const colorSchemeDescriptions = {
  vibrant:
    "vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette",
  sunset:
    "warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow",
  forest:
    "natural green tones, earthy colors, calm and organic palette, fresh atmosphere",
  neon: "neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow",
  purple:
    "purple-dominant color palette, magenta and violet tones, modern and stylish mood",
  monochrome:
    "black and white color scheme, high contrast, dramatic lighting, timeless aesthetic",
  ocean:
    "cool blue and teal tones, aquatic color palette, fresh and clean atmosphere",
  pastel:
    "soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic",
} as const;

export const generateThumbnail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session;

    const {
      title,
      prompt: user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
      // opcional si querés indicar roles (persona/fondo):
      // ej: "img1=person,img2=background"
      reference_hint,
    } = req.body;

    // ✅ 0..2 imágenes (si el request fue multipart/form-data)
    const files = (req as MulterRequest).files ?? [];

    // ✅ Subir referencias a Cloudinary (para persistirlas y guardarlas en Mongo)
    const reference_images: string[] = [];
    for (const f of files) {
      const dataUri = `data:${f.mimetype};base64,${f.buffer.toString("base64")}`;
      const up = await cloudinary.uploader.upload(dataUri, {
        resource_type: "image",
        folder: "thumbzilla/reference",
      });
      reference_images.push(up.secure_url || up.url);
    }

    // ✅ Crear doc en DB (FIX: prompt_used, NO promt_used)
    const thumbnail = await Thumbnail.create({
      userId,
      title,
      prompt_used: user_prompt, // se pisa luego con el prompt final
      user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
      reference_images, // ✅ NUEVO
      isGenerating: true,
    });

    // ✅ Model (tu código tenía "gemini-3-" incompleto)
    const model = "gemini-3-pro-image-preview";

    const generationConfig: GenerateContentConfig = {
      maxOutputTokens: 2048,
      temperature: 0.8,
      topP: 0.95,
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspect_ratio || "16:9",
        imageSize: "1k",
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.OFF,
        },
      ],
    };

    // ✅ Prompt mejorado + instrucciones para usar las imágenes (si existen)
    let prompt = `Create a ${
      stylePrompts[style as keyof typeof stylePrompts]
    } YouTube thumbnail about: "${title}".`;

    if (color_scheme) {
      prompt += ` Use a ${
        colorSchemeDescriptions[
          color_scheme as keyof typeof colorSchemeDescriptions
        ]
      } color scheme.`;
    }

    if (user_prompt) {
      prompt += ` Additional details: ${user_prompt}.`;
    }

    if (files.length > 0) {
      prompt += ` Use the provided reference image(s) as constraints: preserve the person/background style if present, keep strong subject separation, avoid clutter, and ensure high readability on mobile.`;
      if (reference_hint) {
        prompt += ` Reference hint: ${reference_hint}.`;
      }
    }

    prompt += ` The thumbnail should be ${
      aspect_ratio || "16:9"
    }, visually stunning and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`;

    // ✅ Guardar prompt final usado
    thumbnail.prompt_used = prompt;
    await thumbnail.save();

    // ✅ Multimodal contents: imágenes + texto
    const parts: any[] = [];

    for (const f of files) {
      parts.push({
        inlineData: {
          mimeType: f.mimetype,
          data: f.buffer.toString("base64"),
        },
      });
    }

    parts.push({ text: prompt });

    const response: any = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: generationConfig,
    });

    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error("Unexpected response");
    }

    const respParts = response.candidates[0].content.parts;

    let finalBuffer: Buffer | null = null;
    for (const part of respParts) {
      if (part.inlineData?.data) {
        finalBuffer = Buffer.from(part.inlineData.data, "base64");
        break;
      }
    }

    if (!finalBuffer) throw new Error("No image returned from model");

    const filename = `final-output-${Date.now()}.png`;
    const filePath = path.join("images", filename);

    fs.mkdirSync("images", { recursive: true });
    fs.writeFileSync(filePath, finalBuffer);

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
      folder: "thumbzilla/generated",
    });

    thumbnail.image_url = uploadResult.secure_url || uploadResult.url;
    thumbnail.isGenerating = false;

    await thumbnail.save();

    res.json({ message: "Thumbnail generated", thumbnail });

    // remove local file
    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.session;

    await Thumbnail.findOneAndDelete({ _id: id, userId });

    res.json({ message: "Thumbnail deleted successfully" });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
