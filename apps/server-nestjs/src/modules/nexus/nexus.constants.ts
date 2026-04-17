export const NEXUS_PLUGIN_NAME = 'nexus'

export const NEXUS_CONFIG_KEYS = {
  activateMavenRepo: 'activateMavenRepo',
  activateNpmRepo: 'activateNpmRepo',
  mavenSnapshotWritePolicy: 'mavenSnapshotWritePolicy',
  mavenReleaseWritePolicy: 'mavenReleaseWritePolicy',
  npmWritePolicy: 'npmWritePolicy',
} as const

export const DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY = 'allow'
export const DEFAULT_MAVEN_RELEASE_WRITE_POLICY = 'allow_once'
export const DEFAULT_NPM_WRITE_POLICY = 'allow'
