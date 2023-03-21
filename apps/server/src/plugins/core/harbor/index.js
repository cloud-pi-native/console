import { harborUrl, harborUser, harborToken } from '../../utils/env.js'

export const harborFetch = async ({ path, method, json, codes, params }) => {
  const url = harborUrl + path.replace(/^\//, '')
  console.log(url)
  const options = {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(harborUser + ':' + harborToken).toString('base64'),
    },
  }
  let body
  if (params) {
    body = new URLSearchParams()
    Object.entries(params).forEach(params => {
      body.append(params[0], params[1])
    })
    options.body = body
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (json) {
    options.body = body
    options.headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, options)
  if (codes.includes(res.status)) {
    return res.json()
  }
  console.log(res)
  throw Error(res.statusText, { cause: 'already exists' })
}

export const createHarborProject = async (organization, project) => {
  const repName = `${organization}-${project}`
  try {
    await harborFetch({
      method: 'HEAD',
      path: '/projects',
      params: { project_name: repName },
      codes: [404],
    })
  } catch (error) {
    if (error.cause === 'already exists') {
      console.log(repName, error.cause)
    }
  }

  // const listRes = await harborFetch({
  //   method: 'GET',
  //   path: '/projects',
  //   codes: [200],
  // })
  // console.log(listRes)
}
