/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['@lellimecnar/eslint-config'],
  "ignorePatterns": [
    "!src/**",
    "!*.ts",
    "!*.js",
    "**/node_modules/**"
  ],
};
