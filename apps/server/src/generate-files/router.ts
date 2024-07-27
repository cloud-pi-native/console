import * as fs from 'node:fs/promises'
import path from 'node:path'
// @ts-ignore
import Mustache from 'mustache'

import { addReqLogs } from '@/utils/logger.js'
import { serverInstance } from '@/app.js'
import { filesContract } from '@cpn-console/shared'

export const filesRouter = () => serverInstance.router(filesContract, {
  generateCIFiles: async ({ request: req, body: data }) => {
    const content: Record<string, any> = {}

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

    const template = await fs.readFile(path.resolve('src/generate-files/templates/gitlab-ci.yml'))
    const gitlab = Mustache.render(template.toString(), data)
    content['gitlab-ci-dso'] = gitlab

    const rules = await fs.readFile(path.resolve('src/generate-files/templates/rules.yml'))
    content.rules = Mustache.render(rules.toString())
    const vault = await fs.readFile(path.resolve('src/generate-files/templates/vault.yml'))
    content.vault = Mustache.render(vault.toString())
    const docker = await fs.readFile(path.resolve('src/generate-files/templates/docker.yml'))
    content.docker = Mustache.render(docker.toString())

    if (data.typeLanguage === 'python') {
      const python = await fs.readFile(path.resolve('src/generate-files/templates/python.yml'))
      content.python = Mustache.render(python.toString())
    }
    else if (data.typeLanguage === 'java') {
      const java = await fs.readFile(path.resolve('src/generate-files/templates/java.yml'))
      content.java = Mustache.render(java.toString())
    }
    else if (data.typeLanguage === 'node') {
      const node = await fs.readFile(path.resolve('src/generate-files/templates/node.yml'))
      content.node = Mustache.render(node.toString())
    }

    addReqLogs({
      req,
      message: 'Fichiers de gitlab-ci créés avec succès',
    })
    return {
      status: 201,
      body: content,
    }
  },
})
