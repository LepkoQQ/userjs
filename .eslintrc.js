module.exports = {
  root: true,
  env: {
    browser: true,
  },
  parserOptions: {
    sourceType: 'script',
  },
  extends: ['airbnb-base', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'no-console': 'off',
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
//     "strict": ["error", "function"],
//     "no-plusplus": "off",
//     "no-param-reassign": ["error", { "props": false }],
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
