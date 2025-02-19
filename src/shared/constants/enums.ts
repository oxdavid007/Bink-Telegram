export enum EUserRequestStatus {
  INIT = 'INIT',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum EModelType {
  GPT4 = 'GPT4',
  GPT5 = 'GPT5',
  GPT6 = 'GPT6',
}

export enum EModelStatus {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export enum EClusterStatus {
  ENABLE = 'ENABLE',
  RUNNING = 'RUNNING',
  DISABLE = 'DISABLE',
}
