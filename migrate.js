/* eslint-disable import/no-extraneous-dependencies */
const moment = require("moment");
const meow = require("meow");
const mysql = require("mysql2/promise");
require("dotenv").config();
const { forEach } = require("p-iteration");
const produce = require("immer");
const { AutoComplete } = require("enquirer");

const cli = meow(
  `
      Usage
        $ node migrate.js --kiosk=corail
  `,
  {
    flags: {
      kiosk: {
        type: "string",
        alias: "k",
        default: "corail"
      }
    }
  }
);

const selectedKioskName = cli.flags.kiosk;

let legacy_customer_accounts = [];
const customer_id_mapping = {};
let legacy_customer_types = [];
let legacy_products = [];
let legacy_kiosks = [];
let legacy_sales_channels = [];

const main = async () => {
  // create the connection to the legacy database
  const legacyConn = await mysql.createConnection({
    host: "104.131.40.239",
    user: process.env.USERNAME_LEGACY,
    database: "dlo",
    password: process.env.PASSWORD_LEGACY
  });

  // create the connection to database
  const newConn = await mysql.createConnection({
    host: "127.0.0.1",
    user: process.env.USERNAME_NEW,
    database: "sema_dlo_core",
    password: process.env.PASSWORD_NEW
  });

  legacy_kiosks = await legacyConn.query("select * from kiosk");

  const kiosk = legacy_kiosks[0].filter(k => {
    return k.name.toLowerCase() === selectedKioskName.toLowerCase();
  })[0];

  legacy_customer_accounts = await legacyConn.query(
    `select * from customer_account where kiosk_id=${kiosk.id} and customer_type_id=120`
  );

  for (legacyCustomer of legacy_customer_accounts[0]) {
    if (!legacyCustomer.contact_name) continue;

    let name_parts = legacyCustomer.contact_name
      .split(" ")
      .reduce((final, part, idx) => {
        part = part.trim();
        if (idx === 0) return `'%${part}%'`;
        return `${final} OR '%${part}%'`;
      }, "");

    let potential_matches = await newConn.query(
      `select * from customer_account where name like ${name_parts} and kiosk_id=${kiosk.id}`
    );

    const potential_match_names = potential_matches[0].map(match => {
      return match.name;
    });

    if (potential_match_names.length) {
      potential_match_names.push('Cancel');
      potential_match_names.unshift('Create New Customer');

      const match = new AutoComplete({
        name: "match",
        message: `Pick the matching customer name for ${
          legacyCustomer.contact_name
        }`,
        choices: potential_match_names
      });

      const answer = await match.run();
      if (answer === 'Cancel') break;

    console.log(answer);

    } else {
      continue;
      // create this customer
    }
  }

  legacyConn.end();
  newConn.end();
};

main();
