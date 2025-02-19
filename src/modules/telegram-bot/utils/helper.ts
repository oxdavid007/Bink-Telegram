import process from 'process';
import _ from 'lodash';

export const isProduction = () => {
  return process.env.APP_ENV == 'production';
};

export const isStaging = () => {
  return process.env.APP_ENV == 'staging';
};

export const isMainnet = () => {
  return Boolean(Number(process.env.IS_MAINNET || 0) == 1);
};

export const isTesting = () => {
  return !isProduction();
};
