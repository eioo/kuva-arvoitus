import * as dayjs from 'dayjs';

export const logger = {
  log: (message?: any, ...optionalParams: any[]) => {
    const timestamp = dayjs().format('HH:mm:ss');
    console.log(`${timestamp}\t`, message, ...optionalParams);
  },
};
