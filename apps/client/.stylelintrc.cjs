module.exports = {
  root: true,
  extends: [
    'stylelint-config-standard',
    'stylelint-config-html/vue',
    'stylelint-config-html',
    'stylelint-config-recommended-vue',
  ],
  rules: {
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
    'no-descending-specificity': null,
    'selector-class-pattern': '^((sm|md|lg|xl|2xl):)?[a-z][-_/a-z0-9]*$'
  },
}