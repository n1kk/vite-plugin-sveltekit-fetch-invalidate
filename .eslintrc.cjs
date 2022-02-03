/**
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/eslint/index.d.ts#L715
 * @type {import("eslint").Linter.Config} name A name to use.
 */
module.exports = {
    root: true,
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        sourceType: "module",
        project: ["./tsconfig.json"],
    },
    plugins: ["@typescript-eslint", "simple-import-sort"],
    rules: {},
    ignorePatterns: ["src/**/*.spec.ts", "dist/**/*"],
};
