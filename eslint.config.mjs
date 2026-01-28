import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: ["node_modules/", ".next/", "out/", "coverage/", ".trigger/", "packages/"],
  },
  {
    rules: {
      // Allow setState in effects for hydration avoidance and localStorage restoration patterns
      "react-hooks/set-state-in-effect": "off",
      // Enforce consistent import order
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "never",
        },
      ],
      // Warn on console.log (allow warn/error)
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Prefer const over let when possible
      "prefer-const": "warn",
      // Enforce using optional chaining
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      // Accessibility rules
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      // React best practices
      "react/jsx-no-target-blank": "error",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
      "react/self-closing-comp": "warn",
    },
  },
];

export default config;