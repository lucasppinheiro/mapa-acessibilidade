const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'app.js',
        'controllers/**/*.js',
        'middleware/**/*.js',
        'services/**/*.js',
        'utils/**/*.js'
      ],
      exclude: ['scripts/**', 'tests/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75
      }
    }
  }
});
