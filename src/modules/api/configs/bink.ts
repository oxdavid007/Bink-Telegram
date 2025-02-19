import { registerAs } from "@nestjs/config";

export const birdeyeConfig = registerAs("birdeye", () => ({
  birdeyeApiKey: process.env.BIRDEYE_API_KEY,
}));

export const postgresConfig = registerAs("postgres_ai", () => ({
  postgresUrl: process.env.POSTGRES_URL,
}));
