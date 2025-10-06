module.exports = {
  extends: [
    'standard'
  ],
  plugins: [
    'security'
  ],
  rules: {
    // Security-focused ESLint rules
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-new-buffer': 'error',
    
    // Additional security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-with': 'error',
    
    // Prevent common security mistakes
    'no-console': 'warn', // Console logs might expose sensitive info
    'no-debugger': 'error',
    'no-alert': 'error',
    
    // Best practices for security
    'strict': ['error', 'global'],
    'no-unused-vars': 'error',
    'no-undef': 'error'
  },
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  }
};