/* eslint-env node */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['scripts'],
  reporters: ['default'],
  clearMocks: true,
  verbose: true,
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.jest.json',
      diagnostics: true,
    },
  },
};
