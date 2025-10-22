import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // SECURITY: Ban dangerous Node APIs
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",

      // QUALITY: Catch common bugs
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // DEPENDENCIES: Ensure proper imports
      "import/no-unresolved": "off", // Next.js handles this
      "@next/next/no-html-link-for-pages": "error",

      // REACT HOOKS: Prevent common mistakes
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript strict rules
      "@typescript-eslint/explicit-module-boundary-types": "off", // Too verbose for Next.js
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
];

export default eslintConfig;
