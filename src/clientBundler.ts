// tslint:disable: no-var-requires
import * as dayjs from 'dayjs';
import * as readline from 'readline';
import { config } from './env';
import { logger } from './server/utils/logger';
const Bundler = require('parcel-bundler');

const Reset = '\x1b[0m';
const Cyan = '\x1b[36m';
const Green = '\x1b[32m';

const bundler = new Bundler('src/client/index.pug', {
  logLevel: 0,
});

let startDate: Date;

bundler.on('buildStart', () => {
  const timestamp = dayjs().format('HH:mm:ss');

  process.stdout.write(`${timestamp}\t${Cyan}Building client...${Reset}`);
  startDate = new Date();
});

bundler.on('buildEnd', () => {
  const timestamp = dayjs().format('HH:mm:ss');
  const deltaTime = +new Date() - +startDate;

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(
    `${dayjs().format(timestamp)}\t${Green}Done. Took ${deltaTime}ms${Reset}\n`
  );
});

(async () => {
  logger.log(
    `Serving web client on ${Cyan}http://localhost:${config.app.port + Reset}`
  );
  await bundler.serve(config.app.port);
})();
