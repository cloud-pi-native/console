'use strict';
import express, { urlencoded, json } from 'express';
import { ansible } from "./ansible.js";
import { access, constants } from "fs";
const app = express()
const port = process.env.PORT || 8080
const PLAYBOOK_DIR = process.env.PLAYBOOK_DIR
import routes from "/config/matches.json" assert { type: 'json'};

const varKeys = {
  repName: "REPO_NAME",
  orgName: "ORGANIZATION_NAME",
  ownerEmail: "EMAIL",
  projectName: "PROJECT_NAME",
  envList: "ENV_LIST",
  externalRepoUrl: "REPO_SRC",
  internalRepoName: "REPO_DEST",
  externalUserName: "GIT_INPUT_USER",
  externalToken: "GIT_INPUT_PASSWORD"
}

app.use(urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(json()) // for parsing application/json

// let's check if all the playbooks in matches.json are accessible 
Object.entries(routes).map(([route, paths]) => {
  paths.forEach(path => {
    access(`${PLAYBOOK_DIR}${path}`, constants.R_OK, err => {
      if (err) {
        console.error(`Error playbook ${path} is not readable for route ${route}`)
        process.exit(1)
      }
    });
  })
})

app.listen(port, () => {
  console.log(`ansible-api server listening on port ${port}`)
})

app.all('/api/:route', async (req, res) => {
  const route = req.params.route
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed")
  }
  if (route in routes) {
    run_route_playbooks(route, req.body)
    res.status(200).send("Creating...")
    return
  }
  res.status(404).send("Route not found")
})

const convert_vars = (vars) => {
  return Object.entries(vars.extra).reduce((acc, [key, value]) => ({
    ...acc,
    [varKeys?.[key] ?? key]: value
  }), {})
}

const run_route_playbooks = (route, vars) => {
  let extraVars = convert_vars(vars)
  const args = [
    `-i`,
    `${PLAYBOOK_DIR}inventory/${vars.env}`,
    `--vault-password-file`,
    `/config/vault-secret`,
    `--connection=local`,
    `-e`,
    `"${JSON.stringify(extraVars).replaceAll('"', '\\"')}"`
  ]
  ansible(routes[route], args)
}
