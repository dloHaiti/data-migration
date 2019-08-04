/* eslint-disable import/no-extraneous-dependencies */
let axios = require('axios');
const moment = require('moment');
const meow = require('meow');

const cli = meow(
    `
      Usage
        $ node migrate.js --kiosk=corail
  `,
    {
      flags: {
        kiosk: {
          type: 'string',
          alias: 'k',
          default: 'corail'
        }
      }
    }
  );

const selectedKioskName = cli.flags.kiosk;

const axiosOptions = {
    // Using the v1 endpoints
    baseURL: 'http://localhost:3001/api/v1'
  };
  
axios = axios.create(axiosOptions);