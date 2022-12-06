export const fetchJson = async (url, { method, headers, body }) => {
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
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
