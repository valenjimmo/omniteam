import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**"] },
  {
    rules: {
      // Controlled media is served by the authorization-checking endpoint, not an image proxy.
      "@next/next/no-img-element": "off",
      // Published links must stay on the resolved hostname and support non-app domains.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
