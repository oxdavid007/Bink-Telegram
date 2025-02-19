/**
 * Generates a URL to view a token on the platform
 * @param tokenMint The token's mint address
 * @returns The full URL to view the token
 */
export const getTokenViewUrl = (tokenMint: string): string => {
  return `${process.env.CLIENT_URL}/token/${tokenMint}`;
};
