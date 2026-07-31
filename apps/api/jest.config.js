/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.spec.ts", "<rootDir>/src/**/*.spec.ts"],
  moduleNameMapper: {
    "^@relatax/types$": "<rootDir>/../../packages/types/src/index.ts"
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }]
  }
};
