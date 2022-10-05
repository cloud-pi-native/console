# Test CI/CD pipeline on the host machine

## Prerequisite

Download & install [act](https://github.com/nektos/act) on your local machine (this step is done in the local CI script).

```sh
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

## Test CI/CD

Go at the root level of the git project :

```sh
# Go at the root level of the git project
cd `git rev-parse --show-toplevel`

# Start act
sh "$(find . -d -name 'act')"/scripts/run-ci-locally.sh
```

## Results analysis

After the CI as ended to run locally, artifacts are available in the folder `./artifacts/<date>/`. This folder can includes :

- A folder `e2e-report/` that contains if some tests has failed, API logs files generated during tests & screenshots made by Cypress.
- A folder `vulnerability-report/` that contains if security issues are detected, all the description about it.
