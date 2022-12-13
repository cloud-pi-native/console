import qs from 'qs'

export const fetchJson = async (url, { method, headers, body }) => {
  const headersDefault = {
    'Content-type': 'application/json',
  }

  const res = await fetch(url, {
    method,
    headers: headers || headersDefault,
    body: body && qs.stringify(body),
  })

  const json = await res.json()
  if (res.status >= 400) {
    const error = new Error(json.error)
    error.status = res.status
    error.json = json
    throw error
  }
  return json
}
