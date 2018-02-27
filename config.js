const dotenv = require('dotenv');
dotenv.config();

const environments = {
  live: {
    ENVIRONMENT: 'live',
    MONGO: 'mongodb://localhost:27017/public_live',
    BLOCKCHAIN: 'wss://api1.peerplays.download/ws'
  },
  test: {
    ENVIRONMENT: 'test',
    MONGO: 'mongodb://localhost:27017/public_test',
    BLOCKCHAIN: 'wss://api.ppytest.blckchnd.com/'
  },
  dev: {
    ENVIRONMENT: 'dev',
    MONGO: 'mongodb://localhost:27017/private_test',
    BLOCKCHAIN: '' // Populate with your local testnet values.
  }
};

// Validate that the configuration is not empty.
if (!process.env.DB_USER && !process.env.DB_PASS && !process.env.AUTH && !process.env.DB_IP) {
  console.error('Environment Variables are all undefined, please check that you have a .env file in your projects root directory.\n\n');
  process.exit();
}

const IP = `${process.env.DB_IP}:27017/`

// Check to see a different environment was passed.
const environment = process.argv.length > 2 ? process.argv[2].toLowerCase() : 'dev';

// Validate the environment value.
if (!environment || !Object.keys(environments).includes(environment)) {
  console.log(`Missing or invalid environment argument '${environment}'`)
  process.exit();
}

// Build the connection URL for Mongo.
var MONGO = `mongodb://${IP}`;

if (process.env.AUTH === 'true') {
  MONGO = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${IP}`;
  console.log('Authorization Enabled');
  console.log(`Username: ${process.env.DB_USER ? process.env.DB_USER : 'ERR: No Username Detected'}`);
  console.log(`Password: ${process.env.DB_PASS ? '*** SECRET ***' : 'ERR: No Password Detected'}`);
} else {
  console.log(`Authorization Disabled\n\nIf ${MONGO} requires authorization to access, you will be unable to reach the server`);
  console.log('------------------------------------------------------------------------------------------------');
}

module.exports = environments[environment];
