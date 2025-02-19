/**
 * Encode a string to base64
 * @param input string to encode
 * @returns base64 encoded string
 */
export const encodeBase64 = (input: string): string => {
  return Buffer.from(input).toString("base64");
};

/**
 * Decode a base64 string
 * @param input base64 encoded string
 * @returns decoded string
 */
export const decodeBase64 = (input: string): string => {
  return Buffer.from(input, "base64").toString();
};
