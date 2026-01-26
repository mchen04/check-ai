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
    ignores: ["node_modules/", ".next/", "out/", "coverage/", ".trigger/"],
  },
  {
    rules: {
      // Allow setState in effects for hydration avoidance and localStorage restoration patterns
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;