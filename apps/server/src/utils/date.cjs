const { parseISO } = require('date-fns/fp')

const getJSDateFromUtcIso = (dateUtcIso) => {
  return parseISO(dateUtcIso)
}

module.exports = {
  getJSDateFromUtcIso,
}
