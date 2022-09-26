module.exports = {
  root: true,
  extends: [
    'stylelint-config-standard',
    'stylelint-config-html/vue',
    'stylelint-config-html',
    'stylelint-config-recommended-vue',
  ],
  rules: {
    'max-line-length': 160,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'windi',
          'apply',
          'include',
          'variants',
          'responsive',
          'screen',
        ],
      },
    ],
    'declaration-block-trailing-semicolon': null,
    'no-descending-specificity': null,
    'selector-class-pattern': '^((sm|md|lg|xl|2xl):)?[a-z][-_/a-z0-9]*$'
  },
}