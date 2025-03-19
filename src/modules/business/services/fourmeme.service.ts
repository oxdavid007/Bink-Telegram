import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { OnApplicationBootstrap } from '@nestjs/common';
import { NetworkName } from '@binkai/core';

const CONSTANTS = {
  DEFAULT_GAS_LIMIT: '350000',
  APPROVE_GAS_LIMIT: '50000',
  QUOTE_EXPIRY: 5 * 60 * 1000, // 5 minutes in milliseconds
  FOUR_MEME_FACTORY_V3: '0xF251F83e40a78868FcfA3FA4599Dad6494E46034',
  FOUR_MEME_FACTORY_V2: '0x5c952063c7fc8610FFDB798152D69F0B9550762b',
  BNB_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  FOUR_MEME_API_BASE: 'https://four.meme/meme-api/v1',
};

// Add these interfaces for API responses
interface NonceResponse {
  code: number;
  msg: string;
  data: string;
}

@Injectable()
export class FourMemeService implements OnApplicationBootstrap {
  constructor() {}

  async onApplicationBootstrap() {}

  private async getNonce(accountAddress: string, network?: string | 'bnb'): Promise<NonceResponse> {
    const networkCode = 'BSC';

    const response = await fetch(`${CONSTANTS.FOUR_MEME_API_BASE}/private/user/nonce/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        origin: 'https://four.meme',
        referer: 'https://four.meme/create-token',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        accountAddress,
        verifyType: 'LOGIN',
        networkCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Get nonce API request failed with status ${response.status}`);
    }
    const nonceResponse = await response.json();

    return nonceResponse.data;
  }

  async buildSignatureMessage(userAddress: string, network: string = 'bnb') {
    try {
      // Step 1: Get nonce from API
      const nonce = await this.getNonce(userAddress, network);

      // Return the message to be signed
      const message = `You are sign in Meme ${nonce}`;

      return message;
    } catch (error: unknown) {
      console.error('Error getting signature message:', error);
      throw new Error(
        `Failed to get signature message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async getAccessToken(signature: string, address: string, network: string): Promise<any> {
    const response = await fetch(`${CONSTANTS.FOUR_MEME_API_BASE}/private/user/login/dex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        origin: 'https://four.meme',
        referer: 'https://four.meme/create-token',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        verifyInfo: {
          signature,
          address,
          networkCode: 'BSC',
          verifyType: 'LOGIN',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Get access token API request failed with status ${response.status}`);
    }

    const accessTokenResponse = await response.json();
    return accessTokenResponse.data;
  }

  async uploadFile(filePath: string, userAddress: string, signature: string) {
    try {
      const url = 'https://four.meme/meme-api/v1/private/token/upload';

      const memeWebAccess = await this.getAccessToken(signature, userAddress, 'bnb');

      const imageResponse = await axios.get(filePath, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageResponse.data);

      const formData = new FormData();

      formData.append('file', buffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });
      formData.append('networkCode', 'BSC');

      const response: AxiosResponse<any> = await axios.post(url, formData, {
        headers: {
          'meme-web-access': memeWebAccess,
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploadFile', error.message);

      throw error;
    }
  }
}
