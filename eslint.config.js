import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Supabase tables not in generated types intentionally use (supabase as any)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow require() in config and edge function files
      "@typescript-eslint/no-require-imports": "warn",
      // Empty catch blocks are used for graceful silent failures throughout the codebase
      "no-empty": ["error", { "allowEmptyCatch": true }],
      // Empty interfaces and object types come from generated Supabase types
      "@typescript-eslint/no-empty-object-type": "warn",
      // Escape characters in regex — warn only
      "no-useless-escape": "warn",
      // Unused expressions — warn only
      "@typescript-eslint/no-unused-expressions": "warn",
      // Empty patterns from destructuring
      "no-empty-pattern": "warn",
    },
  },
);
