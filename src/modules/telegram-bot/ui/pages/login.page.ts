import {
  createMenuButton,
  isProduction,
  buildPhotoOptions,
  isStaging,
} from '../../utils';
import path from 'path';
import * as fs from 'fs';
import { PhotoPage } from './page';
import { PhotoResponse } from 'modules/telegram-bot/types';
export class LoginPage implements PhotoPage {
  constructor() {}
  build(data?: { accessToken: string }): PhotoResponse {
    const imageFilePath = path.join(
      __dirname,
      '../../../../../src/images/Terminal.png',
    );
    const photo = fs.readFileSync(imageFilePath);

    const { accessToken } = data;

    let url;
    const app_url = 'REPLACE HERE';

    if (isProduction()) {
      url = `${app_url}?token=${accessToken}`;
    } else if (isStaging()) {
      url = `${app_url}?token=${accessToken}`;
    } else {
      url = `${app_url}?token=${accessToken}`;
    }
    const text = `
🎁Play-to-earn airdrop right now!

`;

    const menu = buildPhotoOptions(
      [[createMenuButton('Play', undefined, url)]],
      text,
    );
    return { menu, photo };
  }
}
