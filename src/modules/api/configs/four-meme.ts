import { registerAs } from "@nestjs/config";

export const fourMemeConfig = registerAs("fourMeme", () => ({
  apiBase: process.env.FOUR_MEME_API_BASE,
}));
