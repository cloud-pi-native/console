import type { MemberSchema, ProjectSchema } from '@gitbeaker/core'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { createHash } from 'node:crypto'
import { AccessLevel } from '@gitbeaker/core'
import { stringify } from 'yaml'
import { TOPIC_PLUGIN_MANAGED } from './gitlab.constants'

export type ProjectAccessLevel = Exclude<AccessLevel, (typeof AccessLevel)['ADMIN']>

export function getExternalRepoHost(externalRepoUrl: string | null | undefined): string | undefined {
  if (!externalRepoUrl) return undefined
  try {
    return new URL(externalRepoUrl).host
  } catch {
    return undefined
  }
}

export function hasFileContentChanged(file: { content_sha256?: string } | null | undefined, content: string): boolean {
  return file?.content_sha256 !== digestContent(content)
}

export function digestContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function generateUsername(email: string): string {
  const localPart = email.split('@')[0]
  return localPart.replaceAll(/[^\w-]/g, '')
}

export function generateUsernameCandidates(email: string): string[] {
  const username = generateUsername(email)
  return [username, `${username}_1`, `${username}_2`, `${username}_3`]
}

export function generateName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'User'
}

export function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string): string[] {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => `/${projectSlug}${path}`)
}

export function generateAdminRoleMapping(
  roles: ProjectWithDetails['roles'],
  adminGroupPath: string,
  auditorGroupPath: string,
): { adminRoleId?: string, auditorRoleId?: string } {
  const roleIdByOidcGroup = new Map<string | null, string>(roles.map(r => [r.oidcGroup, r.id] as [string | null, string]))
  return {
    adminRoleId: roleIdByOidcGroup.get(adminGroupPath),
    auditorRoleId: roleIdByOidcGroup.get(auditorGroupPath),
  }
}

export function generateAccessLevelMapping(
  project: ProjectWithDetails,
  groupPaths: { reporter: string[], developer: string[], maintainer: string[] },
): Map<string, ProjectAccessLevel> {
  const getAccessLevelFromOidcGroup = (oidcGroup: string | null): ProjectAccessLevel | null => {
    if (!oidcGroup) return null
    if (groupPaths.reporter.includes(oidcGroup)) return AccessLevel.REPORTER
    if (groupPaths.developer.includes(oidcGroup)) return AccessLevel.DEVELOPER
    if (groupPaths.maintainer.includes(oidcGroup)) return AccessLevel.MAINTAINER
    return null
  }

  const roleAccessLevelById = new Map<string, ProjectAccessLevel | null>(
    project.roles.map(role => [role.id, getAccessLevelFromOidcGroup(role.oidcGroup)]),
  )

  return new Map<string, ProjectAccessLevel>(project.members.map((membership) => {
    let highest: ProjectAccessLevel | null = null
    for (const roleId of membership.roleIds) {
      const level = roleAccessLevelById.get(roleId)
      if (level !== null && level !== undefined && (highest === null || level > highest)) highest = level
    }
    return [membership.user.id, highest ?? AccessLevel.GUEST] as const
  }))
}

export function generateGitlabCIConfigContent() {
  return stringify({
    variables: {
      PROJECT_NAME: {
        description: 'Nom du dépôt (dans ce Gitlab) à synchroniser.',
      },
      GIT_BRANCH_DEPLOY: {
        description: 'Nom de la branche à synchroniser.',
        value: 'main',
      },
      SYNC_ALL: {
        description: 'Synchroniser toutes les branches.',
        value: 'false',
      },
    },
    include: [
      {
        project: '$CATALOG_PATH',
        file: 'mirror.yml',
        ref: 'main',
      },
    ],
    repo_pull_sync: {
      extends: '.repo_pull_sync',
      only: [
        'api',
        'triggers',
        'web',
        'schedules',
      ],
    },
  })
}

export function generateMirrorScriptContent() {
  return `#!/bin/bash

set -e

# Colorize terminal
red='\\e[0;31m'
no_color='\\033[0m'

# Console step increment
i=1

# Default values
BRANCH_TO_SYNC=main

print_help() {
  TEXT_HELPER="\\nThis script aims to send a synchronization request to DSO.\\nFollowing flags are available:
  -a  Api url to send the synchronization request
  -b  Branch which is wanted to be synchronize for the given repository (default '$BRANCH_TO_SYNC')
  -g  GitLab token to trigger the pipeline on the gitlab mirror project
  -i  Gitlab mirror project id
  -r  Gitlab repository name to mirror
  -h  Print script help\\n"
  printf "$TEXT_HELPER"
}

print_args() {
  printf "\\nArguments received:
  -a API_URL: $API_URL
  -b BRANCH_TO_SYNC: $BRANCH_TO_SYNC
  -g GITLAB_TRIGGER_TOKEN length: \${#GITLAB_TRIGGER_TOKEN}
  -i GITLAB_MIRROR_PROJECT_ID: $GITLAB_MIRROR_PROJECT_ID
  -r REPOSITORY_NAME: $REPOSITORY_NAME\\n"
}

# Parse options
while getopts :ha:b:g:i:r: flag
do
  case "\${flag}" in
    a)
      API_URL=\${OPTARG};;
    b)
      BRANCH_TO_SYNC=\${OPTARG};;
    g)
      GITLAB_TRIGGER_TOKEN=\${OPTARG};;
    i)
      GITLAB_MIRROR_PROJECT_ID=\${OPTARG};;
    r)
      REPOSITORY_NAME=\${OPTARG};;
    h)
      printf "\\nHelp requested.\\n"
      print_help
      printf "\\nExiting.\\n"
      exit 0;;
    *)
      printf "\\nInvalid argument \${OPTARG} (\${flag}).\\n"
      print_help
      print_args
      exit 1;;
  esac
done

# Test if arguments are missing
if [ -z \${API_URL} ] || [ -z \${BRANCH_TO_SYNC} ] || [ -z \${GITLAB_TRIGGER_TOKEN} ] || [ -z \${GITLAB_MIRROR_PROJECT_ID} ] || [ -z \${REPOSITORY_NAME} ]; then
  printf "\\nArgument(s) missing!\\n"
  print_help
  print_args
  exit 2
fi

# Print arguments
print_args

# Send synchronization request
printf "\\n\${red}\${i}.\${no_color} Send request to DSO api.\\n\\n"

curl \\
  -X POST \\
  --fail \\
  -F token=\${GITLAB_TRIGGER_TOKEN} \\
  -F ref=main \\
  -F variables[GIT_BRANCH_DEPLOY]=\${BRANCH_TO_SYNC} \\
  -F variables[PROJECT_NAME]=\${REPOSITORY_NAME} \\
  "\${API_URL}/api/v4/projects/\${GITLAB_MIRROR_PROJECT_ID}/trigger/pipeline"
`
}

const ownedUserRegex = /group_\d+_bot/u

export function isOwnedUser(member: MemberSchema) {
  return ownedUserRegex.test(member.username)
}

export function isOwnedRepo(repo: ProjectSchema) {
  return repo.topics?.includes(TOPIC_PLUGIN_MANAGED) ?? false
}

export function isSystemRepo(project: ProjectWithDetails, repo: ProjectSchema) {
  return project.repositories.some(r => r.internalRepoName === repo.name)
}

export function getProjectPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}
export function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function adminRoleFlag(user: ProjectWithDetails['members'][0]['user'], adminRoleId?: string) {
  return adminRoleId ? user.adminRoleIds?.includes(adminRoleId) : undefined
}
