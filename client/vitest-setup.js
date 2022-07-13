import '@testing-library/jest-dom'

window.matchMedia = function () {
  return { matches: false }
}
