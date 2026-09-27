import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Variables starting with "_" are intentionally unused (e.g. when removing a key).
      "no-unused-vars": ["error", { varsIgnorePattern: "^(_|[A-Z])", argsIgnorePattern: "^_" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ["useToast"] }],
    },
  },
  {
    files: ["vite.config.js", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
];
