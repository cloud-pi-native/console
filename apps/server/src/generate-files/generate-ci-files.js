import * as fs from 'node:fs/promises'
import Mustache from 'mustache'
import path from 'node:path'

import { getLogInfos } from '../utils/logger.js'
import { send201, send500 } from '../utils/response.js'

export const generateCIFiles = async (req, res) => {
  const content = {}
  const data = req.body

  if (data.typeLanguage === 'java') {
    data.isJava = true
    data.isNode = false
    data.isPython = false
  }
  if (data.typeLanguage === 'node') {
    data.isNode = true
    data.isJava = false
    data.isPython = false
  }
  if (data.typeLanguage === 'python') {
    data.isPython = true
    data.isNode = false
    data.isJava = false
  }

  try {
    const template = await fs.readFile(path.resolve('src/generate-ci-files/templates/gitlab-ci.yml'))
    const gitlab = Mustache.render(template.toString(), data)
    content.gitlab = gitlab

    const rules = await fs.readFile(path.resolve('src/generate-ci-files/templates/rules.yml'))
    content.rules = Mustache.render(rules.toString())
    const vault = await fs.readFile(path.resolve('src/generate-ci-files/templates/vault.yml'))
    content.vault = Mustache.render(vault.toString())
    const docker = await fs.readFile(path.resolve('src/generate-ci-files/templates/docker.yml'))
    content.docker = Mustache.render(docker.toString())

    if (data.typeLanguage === 'python') {
      const python = await fs.readFile(path.resolve('src/generate-ci-files/templates/python.yml'))
      content.python = Mustache.render(python.toString())
    } else if (data.typeLanguage === 'java') {
      const java = await fs.readFile(path.resolve('src/generate-ci-files/templates/java.yml'))
      content.java = Mustache.render(java.toString())
    } else if (data.typeLanguage === 'node') {
      const node = await fs.readFile(path.resolve('src/generate-ci-files/templates/node.yml'))
      content.node = Mustache.render(node.toString())
    }

    send201(res, content)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot generate files',
      error,
    })
    return send500(res, error.message)
  }
}
