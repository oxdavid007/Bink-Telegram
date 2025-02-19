import * as CryptoJS from "crypto-js";

export function encryptPrivateKey(
  privateKey: string,
  secretKey: string
): string {
  return CryptoJS.AES.encrypt(privateKey, secretKey).toString();
}

export function decryptPrivateKey(
  encryptedPrivateKey: string,
  secretKey: string
): string {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}
