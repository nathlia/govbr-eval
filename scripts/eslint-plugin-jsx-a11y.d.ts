// eslint-plugin-jsx-a11y ships no type declarations.
declare module "eslint-plugin-jsx-a11y" {
  import type { ESLint, Linter } from "eslint";
  const plugin: ESLint.Plugin & {
    flatConfigs: {
      recommended: { rules: Linter.RulesRecord };
      strict: { rules: Linter.RulesRecord };
    };
  };
  export default plugin;
}
