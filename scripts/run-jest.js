'use strict';

process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';
process.env.CI = process.env.CI || 'true';

require('dotenv').config({ silent: true });

const path = require('path');
const jest = require('jest');
const createJestConfig = require('../node_modules/react-scripts/utils/createJestConfig');

const config = createJestConfig(
  relativePath => path.resolve(__dirname, '..', 'node_modules', 'react-scripts', relativePath),
  path.resolve(__dirname, '..'),
  false
);

config.testEnvironment = 'jsdom';

const argv = process.argv.slice(2);

if (argv.indexOf('--runInBand') < 0) {
  argv.push('--runInBand');
}

argv.push('--config', JSON.stringify(config));

jest.run(argv);
