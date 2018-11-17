module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "strict": 0,
        "comma-dangle": 0,
        "prefer-destructuring": 0
    },
    plugins: ['chai-friendly'],
    overrides: [{
      files: 'test/*.js',
      rules: {
        'no-unused-expressions': 'off',
        'chai-friendly/no-unused-expressions': 'off',
      },
    }]
}
