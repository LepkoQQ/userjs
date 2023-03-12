module.exports = {
  root: true,
  env: {
    browser: true,
  },
  parserOptions: {
    sourceType: 'script',
    ecmaVersion: 2022,
  },
  extends: ['airbnb-base', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    strict: ['error', 'function'],
    'no-console': 'off',
    'no-param-reassign': ['error', { props: false }],
  },
};

// {
//   "extends": "airbnb-base",
//   "env": {
//     "browser": true
//   },
//   "parserOptions": {
//     "sourceType": "script"
//   },
//   "rules": {
//     "no-plusplus": "off",
//     "prefer-destructuring": ["error", { "object": true, "array": false }],
//     "no-debugger": "off",
//     "comma-dangle": [
//       "error",
//       {
//         "arrays": "always-multiline",
//         "objects": "always-multiline",
//         "imports": "always-multiline",
//         "exports": "always-multiline",
//         "functions": "never"
//       }
//     ]
//   }
// }
