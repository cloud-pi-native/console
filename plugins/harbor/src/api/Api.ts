/* eslint-disable eslint-comments/no-unlimited-disable */
// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** The error array that describe the errors got during the handling of request */
export interface Errors {
  errors?: Error[];
}

/** a model for all the error response coming from harbor */
export interface Error {
  /** The error code */
  code?: string;
  /** The error message */
  message?: string;
}

export interface Search {
  /** Search results of the projects that matched the filter keywords. */
  project?: Project[];
  /** Search results of the repositories that matched the filter keywords. */
  repository?: SearchRepository[];
}

export interface SearchRepository {
  /** The ID of the project that the repository belongs to */
  project_id?: number;
  /** The name of the project that the repository belongs to */
  project_name?: string;
  /** The flag to indicate the publicity of the project that the repository belongs to (1 is public, 0 is not) */
  project_public?: boolean;
  /** The name of the repository */
  repository_name?: string;
  /** The count how many times the repository is pulled */
  pull_count?: number;
  /** The count of artifacts in the repository */
  artifact_count?: number;
}

export interface Repository {
  /**
   * The ID of the repository
   * @format int64
   */
  id?: number;
  /**
   * The ID of the project that the repository belongs to
   * @format int64
   */
  project_id?: number;
  /** The name of the repository */
  name?: string;
  /** The description of the repository */
  description?: string;
  /**
   * The count of the artifacts inside the repository
   * @format int64
   */
  artifact_count: number;
  /**
   * The count that the artifact inside the repository pulled
   * @format int64
   */
  pull_count: number;
  /**
   * The creation time of the repository
   * @format date-time
   */
  creation_time?: string | null;
  /**
   * The update time of the repository
   * @format date-time
   */
  update_time?: string;
}

export interface Artifact {
  /**
   * The ID of the artifact
   * @format int64
   */
  id?: number;
  /** The type of the artifact, e.g. image, chart, etc */
  type?: string;
  /** The media type of the artifact */
  media_type?: string;
  /** The manifest media type of the artifact */
  manifest_media_type?: string;
  /**
   * The ID of the project that the artifact belongs to
   * @format int64
   */
  project_id?: number;
  /**
   * The ID of the repository that the artifact belongs to
   * @format int64
   */
  repository_id?: number;
  /** The digest of the artifact */
  digest?: string;
  /**
   * The size of the artifact
   * @format int64
   */
  size?: number;
  /** The digest of the icon */
  icon?: string;
  /**
   * The push time of the artifact
   * @format date-time
   */
  push_time?: string;
  /**
   * The latest pull time of the artifact
   * @format date-time
   */
  pull_time?: string;
  extra_attrs?: ExtraAttrs;
  annotations?: Annotations;
  references?: Reference[];
  tags?: Tag[];
  addition_links?: AdditionLinks;
  labels?: Label[];
  /** The overview of the scan result. */
  scan_overview?: ScanOverview;
  accessories?: Accessory[];
}

export interface Tag {
  /**
   * The ID of the tag
   * @format int64
   */
  id?: number;
  /**
   * The ID of the repository that the tag belongs to
   * @format int64
   */
  repository_id?: number;
  /**
   * The ID of the artifact that the tag attached to
   * @format int64
   */
  artifact_id?: number;
  /** The name of the tag */
  name?: string;
  /**
   * The push time of the tag
   * @format date-time
   */
  push_time?: string;
  /**
   * The latest pull time of the tag
   * @format date-time
   */
  pull_time?: string;
  /** The immutable status of the tag */
  immutable: boolean;
}

export type ExtraAttrs = Record<string, object>;

export type Annotations = Record<string, string>;

export type AdditionLinks = Record<string, AdditionLink>;

export interface AdditionLink {
  /** The link of the addition */
  href?: string;
  /** Determine whether the link is an absolute URL or not */
  absolute: boolean;
}

export interface Reference {
  /**
   * The parent ID of the reference
   * @format int64
   */
  parent_id?: number;
  /**
   * The child ID of the reference
   * @format int64
   */
  child_id?: number;
  /** The digest of the child artifact */
  child_digest?: string;
  platform?: Platform;
  annotations?: Annotations;
  /** The download URLs */
  urls?: string[];
}

export interface Platform {
  /** The architecture that the artifact applys to */
  architecture?: string;
  /** The OS that the artifact applys to */
  os?: string;
  /** The version of the OS that the artifact applys to */
  "'os.version'"?: string;
  /** The features of the OS that the artifact applys to */
  "'os.features'"?: string[];
  /** The variant of the CPU */
  variant?: string;
}

export interface Label {
  /**
   * The ID of the label
   * @format int64
   */
  id?: number;
  /** The name the label */
  name?: string;
  /** The description the label */
  description?: string;
  /** The color the label */
  color?: string;
  /** The scope the label */
  scope?: string;
  /**
   * The ID of project that the label belongs to
   * @format int64
   */
  project_id?: number;
  /**
   * The creation time the label
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the label
   * @format date-time
   */
  update_time?: string;
}

export interface Scanner {
  /**
   * Name of the scanner
   * @example "Trivy"
   */
  name?: string;
  /**
   * Name of the scanner provider
   * @example "Aqua Security"
   */
  vendor?: string;
  /**
   * Version of the scanner adapter
   * @example "v0.9.1"
   */
  version?: string;
}

/** The scan overview attached in the metadata of tag */
export type ScanOverview = Record<string, NativeReportSummary>;

/** The summary for the native report */
export interface NativeReportSummary {
  /**
   * id of the native scan report
   * @example "5f62c830-f996-11e9-957f-0242c0a89008"
   */
  report_id?: string;
  /**
   * The status of the report generating process
   * @example "Success"
   */
  scan_status?: string;
  /**
   * The overall severity
   * @example "High"
   */
  severity?: string;
  /**
   * The seconds spent for generating the report
   * @format int64
   * @example 300
   */
  duration?: number;
  /** VulnerabilitySummary contains the total number of the foun d vulnerabilities number and numbers of each severity level. */
  summary?: VulnerabilitySummary;
  /**
   * The start time of the scan process that generating report
   * @format date-time
   * @example "2006-01-02T14:04:05Z"
   */
  start_time?: string;
  /**
   * The end time of the scan process that generating report
   * @format date-time
   * @example "2006-01-02T15:04:05Z"
   */
  end_time?: string;
  /**
   * The complete percent of the scanning which value is between 0 and 100
   * @example 100
   */
  complete_percent?: number;
  scanner?: Scanner;
}

/** VulnerabilitySummary contains the total number of the foun d vulnerabilities number and numbers of each severity level. */
export interface VulnerabilitySummary {
  /**
   * The total number of the found vulnerabilities
   * @format int
   * @example 500
   */
  total: number;
  /**
   * The number of the fixable vulnerabilities
   * @format int
   * @example 100
   */
  fixable: number;
  /**
   * Numbers of the vulnerabilities with different severity
   * @example {"Critical":5,"High":5}
   */
  summary: Record<string, number>;
}

export interface AuditLog {
  /** The ID of the audit log entry. */
  id?: number;
  /** Username of the user in this log entry. */
  username?: string;
  /** Name of the repository in this log entry. */
  resource?: string;
  /** Tag of the repository in this log entry. */
  resource_type?: string;
  /** The operation against the repository in this log entry. */
  operation?: string;
  /**
   * The time when this operation is triggered.
   * @format date-time
   * @example "2006-01-02T15:04:05Z"
   */
  op_time?: string;
}

export interface Metadata {
  /** id */
  id?: string;
  /** name */
  name?: string;
  /** icon */
  icon?: string;
  /** maintainers */
  maintainers?: string[];
  /** version */
  version?: string;
  /** source */
  source?: string;
}

export interface Instance {
  /** Unique ID */
  id?: number;
  /** Instance name */
  name?: string;
  /** Description of instance */
  description?: string;
  /** Based on which driver, identified by ID */
  vendor?: string;
  /** The service endpoint of this instance */
  endpoint?: string;
  /** The authentication way supported */
  auth_mode?: string;
  /** The auth credential data if exists */
  auth_info?: Record<string, string>;
  /** The health status */
  status?: string;
  /** Whether the instance is activated or not */
  enabled: boolean;
  /** Whether the instance is default or not */
  default: boolean;
  /** Whether the instance endpoint is insecure or not */
  insecure: boolean;
  /**
   * The timestamp of instance setting up
   * @format int64
   */
  setup_timestamp?: number;
}

export interface PreheatPolicy {
  /** The ID of preheat policy */
  id?: number;
  /** The Name of preheat policy */
  name?: string;
  /** The Description of preheat policy */
  description?: string;
  /** The ID of preheat policy project */
  project_id?: number;
  /** The ID of preheat policy provider */
  provider_id?: number;
  /** The Name of preheat policy provider */
  provider_name?: string;
  /** The Filters of preheat policy */
  filters?: string;
  /** The Trigger of preheat policy */
  trigger?: string;
  /** Whether the preheat policy enabled */
  enabled: boolean;
  /**
   * The Create Time of preheat policy
   * @format date-time
   */
  creation_time?: string;
  /**
   * The Update Time of preheat policy
   * @format date-time
   */
  update_time?: string;
}

export interface Metrics {
  /** The count of task */
  task_count?: number;
  /** The count of success task */
  success_task_count?: number;
  /** The count of error task */
  error_task_count?: number;
  /** The count of pending task */
  pending_task_count?: number;
  /** The count of running task */
  running_task_count?: number;
  /** The count of scheduled task */
  scheduled_task_count?: number;
  /** The count of stopped task */
  stopped_task_count?: number;
}

export interface Execution {
  /** The ID of execution */
  id?: number;
  /** The vendor type of execution */
  vendor_type?: string;
  /** The vendor id of execution */
  vendor_id?: number;
  /** The status of execution */
  status?: string;
  /** The status message of execution */
  status_message?: string;
  metrics?: Metrics;
  /** The trigger of execution */
  trigger?: string;
  extra_attrs?: ExtraAttrs;
  /** The start time of execution */
  start_time?: string;
  /** The end time of execution */
  end_time?: string;
}

export interface Task {
  /** The ID of task */
  id?: number;
  /** The ID of task execution */
  execution_id?: number;
  /** The status of task */
  status?: string;
  /** The status message of task */
  status_message?: string;
  /**
   * The count of task run
   * @format int32
   */
  run_count?: number;
  extra_attrs?: ExtraAttrs;
  /** The creation time of task */
  creation_time?: string;
  /** The update time of task */
  update_time?: string;
  /** The start time of task */
  start_time?: string;
  /** The end time of task */
  end_time?: string;
}

export interface ProviderUnderProject {
  id?: number;
  provider?: string;
  enabled?: boolean;
  default?: boolean;
}

export interface Icon {
  /** The content type of the icon */
  "content-type"?: string;
  /** The base64 encoded content of the icon */
  content?: string;
}

export interface ProjectReq {
  /**
   * The name of the project.
   * @maxLength 255
   */
  project_name?: string;
  /** deprecated, reserved for project creation in replication */
  public?: boolean | null;
  /** The metadata of the project. */
  metadata?: ProjectMetadata;
  /** The CVE allowlist of the project. */
  cve_allowlist?: CVEAllowlist;
  /**
   * The storage quota of the project.
   * @format int64
   */
  storage_limit?: number | null;
  /**
   * The ID of referenced registry when creating the proxy cache project
   * @format int64
   */
  registry_id?: number | null;
}

export interface Project {
  /**
   * Project ID
   * @format int32
   */
  project_id?: number;
  /**
   * The owner ID of the project always means the creator of the project.
   * @format int32
   */
  owner_id?: number;
  /** The name of the project. */
  name?: string;
  /**
   * The ID of referenced registry when the project is a proxy cache project.
   * @format int64
   */
  registry_id?: number;
  /**
   * The creation time of the project.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the project.
   * @format date-time
   */
  update_time?: string;
  /** A deletion mark of the project. */
  deleted?: boolean;
  /** The owner name of the project. */
  owner_name?: string;
  /** Correspond to the UI about whether the project's publicity is  updatable (for UI) */
  togglable?: boolean;
  /** The role ID with highest permission of the current user who triggered the API (for UI).  This attribute is deprecated and will be removed in future versions. */
  current_user_role_id?: number;
  /** The list of role ID of the current user who triggered the API (for UI) */
  current_user_role_ids?: number[];
  /** The number of the repositories under this project. */
  repo_count: number;
  /** The metadata of the project. */
  metadata?: ProjectMetadata;
  /** The CVE allowlist of this project. */
  cve_allowlist?: CVEAllowlist;
}

export interface ProjectDeletable {
  /** Whether the project can be deleted. */
  deletable?: boolean;
  /** The detail message when the project can not be deleted. */
  message?: string;
}

export interface ProjectMetadata {
  /** The public status of the project. The valid values are "true", "false". */
  public?: string;
  /** Whether content trust is enabled or not. If it is enabled, user can't pull unsigned images from this project. The valid values are "true", "false". */
  enable_content_trust?: string | null;
  /** Whether cosign content trust is enabled or not. If it is enabled, user can't pull images without cosign signature from this project. The valid values are "true", "false". */
  enable_content_trust_cosign?: string | null;
  /** Whether prevent the vulnerable images from running. The valid values are "true", "false". */
  prevent_vul?: string | null;
  /** If the vulnerability is high than severity defined here, the images can't be pulled. The valid values are "none", "low", "medium", "high", "critical". */
  severity?: string | null;
  /** Whether scan images automatically when pushing. The valid values are "true", "false". */
  auto_scan?: string | null;
  /** Whether this project reuse the system level CVE allowlist as the allowlist of its own.  The valid values are "true", "false". If it is set to "true" the actual allowlist associate with this project, if any, will be ignored. */
  reuse_sys_cve_allowlist?: string | null;
  /** The ID of the tag retention policy for the project */
  retention_id?: string | null;
}

export interface ProjectSummary {
  /** The number of the repositories under this project. */
  repo_count: number;
  /** The total number of project admin members. */
  project_admin_count?: number;
  /** The total number of maintainer members. */
  maintainer_count?: number;
  /** The total number of developer members. */
  developer_count?: number;
  /** The total number of guest members. */
  guest_count?: number;
  /** The total number of limited guest members. */
  limited_guest_count?: number;
  quota?: ProjectSummaryQuota;
  registry?: Registry;
}

export interface ProjectSummaryQuota {
  /** The hard limits of the quota */
  hard?: ResourceList;
  /** The used status of the quota */
  used?: ResourceList;
}

export interface ProjectScanner {
  /** The identifier of the scanner registration */
  uuid: string;
}

/** The CVE Allowlist for system or project */
export interface CVEAllowlist {
  /** ID of the allowlist */
  id?: number;
  /** ID of the project which the allowlist belongs to.  For system level allowlist this attribute is zero. */
  project_id?: number;
  /** the time for expiration of the allowlist, in the form of seconds since epoch.  This is an optional attribute, if it's not set the CVE allowlist does not expire. */
  expires_at?: number | null;
  items?: CVEAllowlistItem[];
  /**
   * The creation time of the allowlist.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the allowlist.
   * @format date-time
   */
  update_time?: string;
}

/** The item in CVE allowlist */
export interface CVEAllowlistItem {
  /** The ID of the CVE, such as "CVE-2019-10164" */
  cve_id?: string;
}

export interface ReplicationPolicy {
  /**
   * The policy ID.
   * @format int64
   */
  id?: number;
  /** The policy name. */
  name?: string;
  /** The description of the policy. */
  description?: string;
  /** The source registry. */
  src_registry?: Registry;
  /** The destination registry. */
  dest_registry?: Registry;
  /** The destination namespace. */
  dest_namespace?: string;
  /**
   * Specify how many path components will be replaced by the provided destination namespace.
   * The default value is -1 in which case the legacy mode will be applied.
   * @format int8
   */
  dest_namespace_replace_count?: number;
  trigger?: ReplicationTrigger;
  /** The replication policy filter array. */
  filters?: ReplicationFilter[];
  /** Whether to replicate the deletion operation. */
  replicate_deletion?: boolean;
  /** Deprecated, use "replicate_deletion" instead. Whether to replicate the deletion operation. */
  deletion?: boolean;
  /** Whether to override the resources on the destination registry. */
  override?: boolean;
  /** Whether the policy is enabled or not. */
  enabled?: boolean;
  /**
   * The create time of the policy.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the policy.
   * @format date-time
   */
  update_time?: string;
  /**
   * speed limit for each task
   * @format int32
   */
  speed?: number;
  /** Whether to enable copy by chunk. */
  copy_by_chunk?: boolean;
}

export interface ReplicationTrigger {
  /** The replication policy trigger type. The valid values are manual, event_based and scheduled. */
  type?: string;
  trigger_settings?: ReplicationTriggerSettings;
}

export interface ReplicationTriggerSettings {
  /** The cron string for scheduled trigger */
  cron?: string;
}

export interface ReplicationFilter {
  /** The replication policy filter type. */
  type?: string;
  /** The value of replication policy filter. */
  value?: object;
  /** matches or excludes the result */
  decoration?: string;
}

export interface RegistryCredential {
  /** Credential type, such as 'basic', 'oauth'. */
  type?: string;
  /** Access key, e.g. user name when credential type is 'basic'. */
  access_key?: string;
  /** Access secret, e.g. password when credential type is 'basic'. */
  access_secret?: string;
}

export interface Registry {
  /**
   * The registry ID.
   * @format int64
   */
  id: number;
  /** The registry URL string. */
  url?: string;
  /** The registry name. */
  name?: string;
  credential?: RegistryCredential;
  /** Type of the registry, e.g. 'harbor'. */
  type?: string;
  /** Whether or not the certificate will be verified when Harbor tries to access the server. */
  insecure?: boolean;
  /** Description of the registry. */
  description?: string;
  /** Health status of the registry. */
  status?: string;
  /**
   * The create time of the policy.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the policy.
   * @format date-time
   */
  update_time?: string;
}

export interface RegistryUpdate {
  /** The registry name. */
  name?: string | null;
  /** Description of the registry. */
  description?: string | null;
  /** The registry URL. */
  url?: string | null;
  /** Credential type of the registry, e.g. 'basic'. */
  credential_type?: string | null;
  /** The registry access key. */
  access_key?: string | null;
  /** The registry access secret. */
  access_secret?: string | null;
  /** Whether or not the certificate will be verified when Harbor tries to access the server. */
  insecure?: boolean | null;
}

export interface RegistryPing {
  /**
   * The registry ID.
   * @format int64
   */
  id?: number | null;
  /** Type of the registry, e.g. 'harbor'. */
  type?: string | null;
  /** The registry URL. */
  url?: string | null;
  /** Credential type of the registry, e.g. 'basic'. */
  credential_type?: string | null;
  /** The registry access key. */
  access_key?: string | null;
  /** The registry access secret. */
  access_secret?: string | null;
  /** Whether or not the certificate will be verified when Harbor tries to access the server. */
  insecure?: boolean | null;
}

/** The registry info contains the base info and capability declarations of the registry */
export interface RegistryInfo {
  /** The registry type */
  type?: string;
  /** The description */
  description?: string;
  /** The filters that the registry supports */
  supported_resource_filters?: FilterStyle[];
  /** The triggers that the registry supports */
  supported_triggers?: string[];
  /** The registry whether support copy by chunk. */
  supported_copy_by_chunk?: boolean;
}

/** The registry provider info contains the base info and capability declarations of the registry provider */
export interface RegistryProviderInfo {
  /** The endpoint pattern */
  endpoint_pattern?: RegistryProviderEndpointPattern;
  /** The credential pattern */
  credential_pattern?: RegistryProviderCredentialPattern;
}

/** The registry endpoint pattern */
export interface RegistryProviderEndpointPattern {
  /** The endpoint type */
  endpoint_type?: string;
  /** The endpoint list */
  endpoints?: RegistryEndpoint[];
}

/** The registry credential pattern */
export interface RegistryProviderCredentialPattern {
  /** The access key type */
  access_key_type?: string;
  /** The access key data */
  access_key_data?: string;
  /** The access secret type */
  access_secret_type?: string;
  /** The access secret data */
  access_secret_data?: string;
}

/** The style of the resource filter */
export interface RegistryEndpoint {
  /** The endpoint key */
  key?: string;
  /** The endpoint value */
  value?: string;
}

/** The style of the resource filter */
export interface FilterStyle {
  /** The filter type */
  type?: string;
  /** The filter style */
  style?: string;
  /** The filter values */
  values?: string[];
}

export type ResourceList = Record<string, number>;

/** The replication execution */
export interface ReplicationExecution {
  /** The ID of the execution */
  id?: number;
  /** The ID if the policy that the execution belongs to */
  policy_id?: number;
  /** The status of the execution */
  status?: string;
  /** The trigger mode */
  trigger?: string;
  /**
   * The start time
   * @format date-time
   */
  start_time?: string;
  /**
   * The end time
   * @format date-time
   */
  end_time?: string;
  /** The status text */
  status_text: string;
  /** The total count of all executions */
  total: number;
  /** The count of failed executions */
  failed: number;
  /** The count of succeed executions */
  succeed: number;
  /** The count of in_progress executions */
  in_progress: number;
  /** The count of stopped executions */
  stopped: number;
}

export interface StartReplicationExecution {
  /**
   * The ID of policy that the execution belongs to.
   * @format int64
   */
  policy_id?: number;
}

/** The replication task */
export interface ReplicationTask {
  /** The ID of the task */
  id?: number;
  /** The ID of the execution that the task belongs to */
  execution_id?: number;
  /** The status of the task */
  status?: string;
  /** The ID of the underlying job that the task related to */
  job_id?: string;
  /** The operation of the task */
  operation?: string;
  /** The type of the resource that the task operates */
  resource_type?: string;
  /** The source resource that the task operates */
  src_resource?: string;
  /** The destination resource that the task operates */
  dst_resource?: string;
  /**
   * The start time of the task
   * @format date-time
   */
  start_time?: string;
  /**
   * The end time of the task
   * @format date-time
   */
  end_time?: string;
}

export interface Robot {
  /**
   * The ID of the robot
   * @format int64
   */
  id?: number;
  /** The name of the robot */
  name?: string;
  /** The description of the robot */
  description?: string;
  /** The secret of the robot */
  secret?: string;
  /** The level of the robot, project or system */
  level?: string;
  /**
   * The duration of the robot in days
   * @format int64
   */
  duration?: number;
  /** The editable status of the robot */
  editable: boolean;
  /** The disable status of the robot */
  disable: boolean;
  /**
   * The expiration date of the robot
   * @format int64
   */
  expires_at?: number;
  permissions?: RobotPermission[];
  /**
   * The creation time of the robot.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the robot.
   * @format date-time
   */
  update_time?: string;
}

/** The request for robot account creation. */
export interface RobotCreate {
  /** The name of the robot */
  name?: string;
  /** The description of the robot */
  description?: string;
  /** The secret of the robot */
  secret?: string;
  /** The level of the robot, project or system */
  level?: string;
  /** The disable status of the robot */
  disable?: boolean;
  /**
   * The duration of the robot in days
   * @format int64
   */
  duration?: number;
  permissions?: RobotPermission[];
}

/** The response for robot account creation. */
export interface RobotCreated {
  /**
   * The ID of the robot
   * @format int64
   */
  id?: number;
  /** The name of the robot */
  name?: string;
  /** The secret of the robot */
  secret?: string;
  /**
   * The creation time of the robot.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The expiration date of the robot
   * @format int64
   */
  expires_at?: number;
}

/** The response for refresh/update robot account secret. */
export interface RobotSec {
  /** The secret of the robot */
  secret?: string;
}

export interface RobotPermission {
  /** The kind of the permission */
  kind?: string;
  /** The namespace of the permission */
  namespace?: string;
  access?: Access[];
}

export interface Access {
  /** The resource of the access. Possible resources are *, artifact, artifact-addition, artifact-label, audit-log, catalog, configuration, distribution, garbage-collection, helm-chart, helm-chart-version, helm-chart-version-label, immutable-tag, label, ldap-user, log, member, metadata, notification-policy, preheat-instance, preheat-policy, project, quota, registry, replication, replication-adapter, replication-policy, repository, robot, scan, scan-all, scanner, system-volumes, tag, tag-retention, user, user-group or "" (for self-reference). */
  resource?: string;
  /** The action of the access. Possible actions are *, pull, push, create, read, update, delete, list, operate, scanner-pull and stop. */
  action?: string;
  /** The effect of the access */
  effect?: string;
}

export interface RobotCreateV1 {
  /** The name of robot account */
  name?: string;
  /** The description of robot account */
  description?: string;
  /** The expiration time on or after which the JWT MUST NOT be accepted for processing. */
  expires_at?: number;
  /** The permission of robot account */
  access?: Access[];
}

export interface Storage {
  /**
   * Total volume size.
   * @format uint64
   */
  total?: number;
  /**
   * Free volume size.
   * @format uint64
   */
  free?: number;
}

export interface GeneralInfo {
  /**
   * The banner message for the UI. It is the stringified result of the banner message object.
   * @example "{"closable":true,"message":"your banner message content","type":"warning","fromDate":"06/19/2023","toDate":"06/21/2023"}"
   */
  banner_message?: string | null;
  /**
   * The current time of the server.
   * @format date-time
   */
  current_time?: string | null;
  /** The url of registry against which the docker command should be issued. */
  registry_url?: string | null;
  /** The external URL of Harbor, with protocol. */
  external_url?: string | null;
  /** The auth mode of current Harbor instance. */
  auth_mode?: string | null;
  /** The flag to indicate whether the current auth mode should consider as a primary one. */
  primary_auth_mode?: boolean | null;
  /** Indicate who can create projects, it could be 'adminonly' or 'everyone'. */
  project_creation_restriction?: string | null;
  /** Indicate whether the Harbor instance enable user to register himself. */
  self_registration?: boolean | null;
  /** Indicate whether there is a ca root cert file ready for download in the file system. */
  has_ca_root?: boolean | null;
  /** The build version of Harbor. */
  harbor_version?: string | null;
  /** The storage provider's name of Harbor registry */
  registry_storage_provider_name?: string | null;
  /** The flag to indicate whether Harbor is in readonly mode. */
  read_only?: boolean | null;
  /** The flag to indicate whether notification mechanism is enabled on Harbor instance. */
  notification_enable?: boolean | null;
  /** The setting of auth proxy this is only available when Harbor relies on authproxy for authentication. */
  authproxy_settings?: AuthproxySetting | null;
}

export interface AuthproxySetting {
  /** The fully qualified URI of login endpoint of authproxy, such as 'https://192.168.1.2:8443/login' */
  endpoint?: string;
  /** The fully qualified URI of token review endpoint of authproxy, such as 'https://192.168.1.2:8443/tokenreview' */
  tokenreivew_endpoint?: string;
  /** The flag to determine whether Harbor can skip search the user/group when adding him as a member. */
  skip_search?: boolean;
  /** The flag to determine whether Harbor should verify the certificate when connecting to the auth proxy. */
  verify_cert?: boolean;
  /** The certificate to be pinned when connecting auth proxy. */
  server_certificate?: string;
}

export interface SystemInfo {
  /** The storage of system. */
  storage?: Storage[];
}

export interface GCHistory {
  /** the id of gc job. */
  id?: number;
  /** the job name of gc job. */
  job_name?: string;
  /** the job kind of gc job. */
  job_kind?: string;
  /** the job parameters of gc job. */
  job_parameters?: string;
  schedule?: ScheduleObj;
  /** the status of gc job. */
  job_status?: string;
  /** if gc job was deleted. */
  deleted?: boolean;
  /**
   * the creation time of gc job.
   * @format date-time
   */
  creation_time?: string;
  /**
   * the update time of gc job.
   * @format date-time
   */
  update_time?: string;
}

export interface ExecHistory {
  /** the id of purge job. */
  id?: number;
  /** the job name of purge job. */
  job_name?: string;
  /** the job kind of purge job. */
  job_kind?: string;
  /** the job parameters of purge job. */
  job_parameters?: string;
  schedule?: ScheduleObj;
  /** the status of purge job. */
  job_status?: string;
  /** if purge job was deleted. */
  deleted?: boolean;
  /**
   * the creation time of purge job.
   * @format date-time
   */
  creation_time?: string;
  /**
   * the update time of purge job.
   * @format date-time
   */
  update_time?: string;
}

export interface Schedule {
  /** The id of the schedule. */
  id?: number;
  /** The status of the schedule. */
  status?: string;
  /**
   * the creation time of the schedule.
   * @format date-time
   */
  creation_time?: string;
  /**
   * the update time of the schedule.
   * @format date-time
   */
  update_time?: string;
  schedule?: ScheduleObj;
  /** The parameters of schedule job */
  parameters?: Record<string, object>;
}

export interface ScheduleObj {
  /**
   * The schedule type. The valid values are 'Hourly', 'Daily', 'Weekly', 'Custom', 'Manual', 'None' and 'Schedule'.
   * 'Manual' means to trigger it right away, 'Schedule' means to trigger it by a specified cron schedule and
   * 'None' means to cancel the schedule.
   */
  type?: "Hourly" | "Daily" | "Weekly" | "Custom" | "Manual" | "None" | "Schedule";
  /** A cron expression, a time-based job scheduler. */
  cron?: string;
  /**
   * The next time to schedule to run the job.
   * @format date-time
   */
  next_scheduled_time?: string;
}

/** Stats provides the overall progress of the scan all process. */
export interface Stats {
  /**
   * The total number of scan processes triggered by the scan all action
   * @format int
   * @example 100
   */
  total: number;
  /**
   * The number of the finished scan processes triggered by the scan all action
   * @format int
   * @example 90
   */
  completed: number;
  /**
   * The metrics data for the each status
   * @example {"Success":5,"Error":2,"Running":3}
   */
  metrics?: Record<string, number>;
  /** A flag indicating job status of scan all. */
  ongoing: boolean;
  /** The trigger of the scan all job. */
  trigger?: "Manual" | "Schedule" | "Event";
}

/** the tag retention metadata */
export interface RetentionMetadata {
  /** templates */
  templates?: RetentionRuleMetadata[];
  /** supported scope selectors */
  scope_selectors?: RetentionSelectorMetadata[];
  /** supported tag selectors */
  tag_selectors?: RetentionSelectorMetadata[];
}

/** the tag retention rule metadata */
export interface RetentionRuleMetadata {
  /** rule id */
  rule_template?: string;
  /** rule display text */
  display_text?: string;
  /** rule action */
  action?: string;
  /** rule params */
  params?: RetentionRuleParamMetadata[];
}

/** rule param */
export interface RetentionRuleParamMetadata {
  type?: string;
  unit?: string;
  required?: boolean;
}

/** retention selector */
export interface RetentionSelectorMetadata {
  display_text?: string;
  kind?: string;
  decorations?: string[];
}

/** retention policy */
export interface RetentionPolicy {
  /** @format int64 */
  id?: number;
  algorithm?: string;
  rules?: RetentionRule[];
  trigger?: RetentionRuleTrigger;
  scope?: RetentionPolicyScope;
}

export interface RetentionRuleTrigger {
  kind?: string;
  settings?: object;
  references?: object;
}

export interface RetentionPolicyScope {
  level?: string;
  ref?: number;
}

export interface RetentionRule {
  id?: number;
  priority?: number;
  disabled?: boolean;
  action?: string;
  template?: string;
  params?: Record<string, object>;
  tag_selectors?: RetentionSelector[];
  scope_selectors?: Record<string, RetentionSelector[]>;
}

export interface RetentionSelector {
  kind?: string;
  decoration?: string;
  pattern?: string;
  extras?: string;
}

export interface RetentionExecution {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  policy_id?: number;
  start_time?: string;
  end_time?: string;
  status?: string;
  trigger?: string;
  dry_run?: boolean;
}

export interface RetentionExecutionTask {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  execution_id?: number;
  repository?: string;
  job_id?: string;
  status?: string;
  status_code: number;
  /** @format int64 */
  status_revision?: number;
  start_time?: string;
  end_time?: string;
  total: number;
  retained: number;
}

export interface QuotaUpdateReq {
  /** The new hard limits for the quota */
  hard?: ResourceList;
}

export type QuotaRefObject = Record<string, any>;

/** The quota object */
export interface Quota {
  /** ID of the quota */
  id?: number;
  /** The reference object of the quota */
  ref?: QuotaRefObject;
  /** The hard limits of the quota */
  hard: ResourceList;
  /** The used status of the quota */
  used: ResourceList;
  /**
   * the creation time of the quota
   * @format date-time
   */
  creation_time?: string;
  /**
   * the update time of the quota
   * @format date-time
   */
  update_time?: string;
}

/** Registration represents a named configuration for invoking a scanner via its adapter. */
export interface ScannerRegistration {
  /** The unique identifier of this registration. */
  uuid?: string;
  /**
   * The name of this registration.
   * @example "Trivy"
   */
  name?: string;
  /**
   * An optional description of this registration.
   * @example "A free-to-use tool that scans container images for package vulnerabilities.
   * "
   */
  description: string;
  /**
   * A base URL of the scanner adapter
   * @format uri
   * @example "http://harbor-scanner-trivy:8080"
   */
  url?: string;
  /**
   * Indicate whether the registration is enabled or not
   * @default false
   */
  disabled: boolean;
  /**
   * Indicate if the registration is set as the system default one
   * @default false
   */
  is_default: boolean;
  /**
   * Specify what authentication approach is adopted for the HTTP communications.
   * Supported types Basic", "Bearer" and api key header "X-ScannerAdapter-API-Key"
   * @default ""
   * @example "Bearer"
   */
  auth: string;
  /**
   * An optional value of the HTTP Authorization header sent with each request to the Scanner Adapter API.
   * @example "Bearer: JWTTOKENGOESHERE"
   */
  access_credential: string;
  /**
   * Indicate if skip the certificate verification when sending HTTP requests
   * @default false
   */
  skip_certVerify: boolean;
  /**
   * Indicate whether use internal registry addr for the scanner to pull content or not
   * @default false
   */
  use_internal_addr: boolean;
  /**
   * The creation time of this registration
   * @format date-time
   */
  create_time?: string;
  /**
   * The update time of this registration
   * @format date-time
   */
  update_time?: string;
  /**
   * Optional property to describe the name of the scanner registration
   * @example "Trivy"
   */
  adapter?: string;
  /**
   * Optional property to describe the vendor of the scanner registration
   * @example "CentOS"
   */
  vendor?: string;
  /**
   * Optional property to describe the version of the scanner registration
   * @example "1.0.1"
   */
  version?: string;
  /**
   * Indicate the healthy of the registration
   * @default ""
   * @example "healthy"
   */
  health?: string;
}

export interface ScannerRegistrationReq {
  /**
   * The name of this registration
   * @example "Trivy"
   */
  name: string;
  /**
   * An optional description of this registration.
   * @example "A free-to-use tool that scans container images for package vulnerabilities.
   * "
   */
  description?: string;
  /**
   * A base URL of the scanner adapter.
   * @format uri
   * @example "http://harbor-scanner-trivy:8080"
   */
  url: string;
  /**
   * Specify what authentication approach is adopted for the HTTP communications.
   * Supported types Basic", "Bearer" and api key header "X-ScannerAdapter-API-Key"
   * @example "Bearer"
   */
  auth?: string;
  /**
   * An optional value of the HTTP Authorization header sent with each request to the Scanner Adapter API.
   * @example "Bearer: JWTTOKENGOESHERE"
   */
  access_credential?: string;
  /**
   * Indicate if skip the certificate verification when sending HTTP requests
   * @default false
   */
  skip_certVerify?: boolean;
  /**
   * Indicate whether use internal registry addr for the scanner to pull content or not
   * @default false
   */
  use_internal_addr?: boolean;
  /**
   * Indicate whether the registration is enabled or not
   * @default false
   */
  disabled?: boolean;
}

export interface ScannerRegistrationSettings {
  /**
   * The name of this registration
   * @example "Trivy"
   */
  name: string;
  /**
   * A base URL of the scanner adapter.
   * @format uri
   * @example "http://harbor-scanner-trivy:8080"
   */
  url: string;
  /**
   * Specify what authentication approach is adopted for the HTTP communications.
   * Supported types Basic", "Bearer" and api key header "X-ScannerAdapter-API-Key"
   * @default ""
   */
  auth?: string;
  /**
   * An optional value of the HTTP Authorization header sent with each request to the Scanner Adapter API.
   * @example "Bearer: JWTTOKENGOESHERE"
   */
  access_credential?: string;
}

export interface IsDefault {
  /** A flag indicating whether a scanner registration is default. */
  is_default?: boolean;
}

export interface ScannerCapability {
  consumes_mime_types?: string[];
  produces_mime_types?: string[];
}

/** The metadata info of the scanner adapter */
export interface ScannerAdapterMetadata {
  scanner?: Scanner;
  capabilities?: ScannerCapability[];
  /** @example {"harbor.scanner-adapter/registry-authorization-type":"Bearer"} */
  properties?: Record<string, string>;
}

export interface ImmutableRule {
  id?: number;
  priority?: number;
  disabled?: boolean;
  action?: string;
  template?: string;
  params?: Record<string, object>;
  tag_selectors?: ImmutableSelector[];
  scope_selectors?: Record<string, ImmutableSelector[]>;
}

export interface ImmutableSelector {
  kind?: string;
  decoration?: string;
  pattern?: string;
  extras?: string;
}

/** The ldap configure properties */
export interface LdapConf {
  /** The url of ldap service. */
  ldap_url?: string;
  /** The search dn of ldap service. */
  ldap_search_dn?: string;
  /** The search password of ldap service. */
  ldap_search_password?: string;
  /** The base dn of ldap service. */
  ldap_base_dn?: string;
  /** The serach filter of ldap service. */
  ldap_filter?: string;
  /** The serach uid from ldap service attributes. */
  ldap_uid?: string;
  /**
   * The serach scope of ldap service.
   * @format int64
   */
  ldap_scope?: number;
  /**
   * The connect timeout of ldap service(second).
   * @format int64
   */
  ldap_connection_timeout?: number;
  /** Verify Ldap server certificate. */
  ldap_verify_cert?: boolean;
}

/** The ldap ping result */
export interface LdapPingResult {
  /** Test success */
  success?: boolean;
  /** The ping operation output message. */
  message?: string;
}

export interface LdapImportUsers {
  /** selected uid list */
  ldap_uid_list?: string[];
}

export interface LdapFailedImportUser {
  /** the uid can't add to system. */
  uid?: string;
  /** fail reason. */
  error?: string;
}

export interface LdapUser {
  /** ldap username. */
  username?: string;
  /** The user realname from "uid" or "cn" attribute. */
  realname?: string;
  /** The user email address from "mail" or "email" attribute. */
  email?: string;
}

export interface UserGroup {
  /** The ID of the user group */
  id?: number;
  /** The name of the user group */
  group_name?: string;
  /** The group type, 1 for LDAP group, 2 for HTTP group, 3 for OIDC group. */
  group_type?: number;
  /** The DN of the LDAP group if group type is 1 (LDAP group). */
  ldap_group_dn?: string;
}

export interface UserGroupSearchItem {
  /** The ID of the user group */
  id?: number;
  /** The name of the user group */
  group_name?: string;
  /** The group type, 1 for LDAP group, 2 for HTTP group, 3 for OIDC group. */
  group_type?: number;
}

/** Supported webhook event types and notify types. */
export interface SupportedWebhookEventTypes {
  event_type?: EventType[];
  notify_type?: NotifyType[];
  payload_formats?: PayloadFormat[];
}

/**
 * Webhook supported event type.
 * @example "PULL_ARTIFACT"
 */
export type EventType = string;

/**
 * Webhook supported notify type.
 * @example "http"
 */
export type NotifyType = string;

/**
 * The type of webhook paylod format.
 * @example "CloudEvents"
 */
export type PayloadFormatType = string;

/** Webhook supported payload format type collections. */
export interface PayloadFormat {
  /** Webhook supported notify type. */
  notify_type?: NotifyType;
  /** The supported payload formats for this notify type. */
  formats?: PayloadFormatType[];
}

/** The webhook policy target object. */
export interface WebhookTargetObject {
  /** The webhook target notify type. */
  type?: string;
  /** The webhook target address. */
  address?: string;
  /** The webhook auth header. */
  auth_header?: string;
  /** Whether or not to skip cert verify. */
  skip_cert_verify?: boolean;
  /** The payload format of webhook, by default is Default for http type. */
  payload_format?: PayloadFormatType;
}

/** The webhook policy object */
export interface WebhookPolicy {
  /**
   * The webhook policy ID.
   * @format int64
   */
  id?: number;
  /** The name of webhook policy. */
  name?: string;
  /** The description of webhook policy. */
  description?: string;
  /** The project ID of webhook policy. */
  project_id?: number;
  targets?: WebhookTargetObject[];
  event_types?: string[];
  /** The creator of the webhook policy. */
  creator?: string;
  /**
   * The create time of the webhook policy.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the webhook policy.
   * @format date-time
   */
  update_time?: string;
  /** Whether the webhook policy is enabled or not. */
  enabled: boolean;
}

/** The webhook policy and last trigger time group by event type. */
export interface WebhookLastTrigger {
  /** The webhook policy name. */
  policy_name?: string;
  /** The webhook event type. */
  event_type?: string;
  /** Whether or not the webhook policy enabled. */
  enabled?: boolean;
  /**
   * The creation time of webhook policy.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The last trigger time of webhook policy.
   * @format date-time
   */
  last_trigger_time?: string;
}

/** The webhook job. */
export interface WebhookJob {
  /**
   * The webhook job ID.
   * @format int64
   */
  id?: number;
  /**
   * The webhook policy ID.
   * @format int64
   */
  policy_id?: number;
  /** The webhook job event type. */
  event_type?: string;
  /** The webhook job notify type. */
  notify_type?: string;
  /** The webhook job status. */
  status?: string;
  /** The webhook job notify detailed data. */
  job_detail?: string;
  /**
   * The webhook job creation time.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The webhook job update time.
   * @format date-time
   */
  update_time?: string;
}

export type InternalConfigurationsResponse = Record<string, InternalConfigurationValue>;

export interface InternalConfigurationValue {
  /** The value of current config item */
  value?: object;
  /** The configure item can be updated or not */
  editable: boolean;
}

export interface ConfigurationsResponse {
  /** The auth mode of current system, such as "db_auth", "ldap_auth", "oidc_auth" */
  auth_mode?: StringConfigItem;
  /** The flag to indicate whether the current auth mode should consider as a primary one. */
  primary_auth_mode?: BoolConfigItem;
  /** The Base DN for LDAP binding. */
  ldap_base_dn?: StringConfigItem;
  /** The filter for LDAP search */
  ldap_filter?: StringConfigItem;
  /** The base DN to search LDAP group. */
  ldap_group_base_dn?: StringConfigItem;
  /** Specify the ldap group which have the same privilege with Harbor admin */
  ldap_group_admin_dn?: StringConfigItem;
  /** The attribute which is used as identity of the LDAP group, default is cn.' */
  ldap_group_attribute_name?: StringConfigItem;
  /** The filter to search the ldap group */
  ldap_group_search_filter?: StringConfigItem;
  /** The scope to search ldap group. ''0-LDAP_SCOPE_BASE, 1-LDAP_SCOPE_ONELEVEL, 2-LDAP_SCOPE_SUBTREE'' */
  ldap_group_search_scope?: IntegerConfigItem;
  /** The scope to search ldap users,'0-LDAP_SCOPE_BASE, 1-LDAP_SCOPE_ONELEVEL, 2-LDAP_SCOPE_SUBTREE' */
  ldap_scope?: IntegerConfigItem;
  /** The DN of the user to do the search. */
  ldap_search_dn?: StringConfigItem;
  /** Timeout in seconds for connection to LDAP server */
  ldap_timeout?: IntegerConfigItem;
  /** The attribute which is used as identity for the LDAP binding, such as "CN" or "SAMAccountname" */
  ldap_uid?: StringConfigItem;
  /** The URL of LDAP server */
  ldap_url?: StringConfigItem;
  /** Whether verify your OIDC server certificate, disable it if your OIDC server is hosted via self-hosted certificate. */
  ldap_verify_cert?: BoolConfigItem;
  /** The user attribute to identify the group membership */
  ldap_group_membership_attribute?: StringConfigItem;
  /** Indicate who can create projects, it could be ''adminonly'' or ''everyone''. */
  project_creation_restriction?: StringConfigItem;
  /** The flag to indicate whether Harbor is in readonly mode. */
  read_only?: BoolConfigItem;
  /** Whether the Harbor instance supports self-registration.  If it''s set to false, admin need to add user to the instance. */
  self_registration?: BoolConfigItem;
  /** The expiration time of the token for internal Registry, in minutes. */
  token_expiration?: IntegerConfigItem;
  /** The client id of UAA */
  uaa_client_id?: StringConfigItem;
  /** The client secret of the UAA */
  uaa_client_secret?: StringConfigItem;
  /** The endpoint of the UAA */
  uaa_endpoint?: StringConfigItem;
  /** Verify the certificate in UAA server */
  uaa_verify_cert?: BoolConfigItem;
  /** The endpoint of the HTTP auth */
  http_authproxy_endpoint?: StringConfigItem;
  /** The token review endpoint */
  http_authproxy_tokenreview_endpoint?: StringConfigItem;
  /** The group which has the harbor admin privileges */
  http_authproxy_admin_groups?: StringConfigItem;
  /** The usernames which has the harbor admin privileges */
  http_authproxy_admin_usernames?: StringConfigItem;
  /** Verify the HTTP auth provider's certificate */
  http_authproxy_verify_cert?: BoolConfigItem;
  /** Search user before onboard */
  http_authproxy_skip_search?: BoolConfigItem;
  /** The certificate of the HTTP auth provider */
  http_authproxy_server_certificate?: StringConfigItem;
  /** The OIDC provider name */
  oidc_name?: StringConfigItem;
  /** The endpoint of the OIDC provider */
  oidc_endpoint?: StringConfigItem;
  /** The client ID of the OIDC provider */
  oidc_client_id?: StringConfigItem;
  /** The attribute claims the group name */
  oidc_groups_claim?: StringConfigItem;
  /** The OIDC group which has the harbor admin privileges */
  oidc_admin_group?: StringConfigItem;
  /** The OIDC group filter which filters out the group doesn't match the regular expression */
  oidc_group_filter?: StringConfigItem;
  /** The scope of the OIDC provider */
  oidc_scope?: StringConfigItem;
  /** The attribute claims the username */
  oidc_user_claim?: StringConfigItem;
  /** Verify the OIDC provider's certificate' */
  oidc_verify_cert?: BoolConfigItem;
  /** Auto onboard the OIDC user */
  oidc_auto_onboard?: BoolConfigItem;
  /** Extra parameters to add when redirect request to OIDC provider */
  oidc_extra_redirect_parms?: StringConfigItem;
  /** The robot account token duration in days */
  robot_token_duration?: IntegerConfigItem;
  /** The rebot account name prefix */
  robot_name_prefix?: StringConfigItem;
  /** Enable notification */
  notification_enable?: BoolConfigItem;
  /** Enable quota per project */
  quota_per_project_enable?: BoolConfigItem;
  /** The storage quota per project */
  storage_per_project?: IntegerConfigItem;
  /** The endpoint of the audit log forwarder */
  audit_log_forward_endpoint?: StringConfigItem;
  /** Whether skip the audit log in database */
  skip_audit_log_database?: BoolConfigItem;
  /** Whether or not to skip update the pull time for scanner */
  scanner_skip_update_pulltime?: BoolConfigItem;
  scan_all_policy?: {
    /** The type of scan all policy, currently the valid values are "none" and "daily" */
    type?: string;
    /** The parameters of the policy, the values are dependent on the type of the policy. */
    parameter?: {
      /** The offset in seconds of UTC 0 o'clock, only valid when the policy type is "daily" */
      daily_time?: number;
    };
  };
  /** The session timeout in minutes */
  session_timeout?: IntegerConfigItem;
  /** The banner message for the UI.It is the stringified result of the banner message object */
  banner_message?: StringConfigItem;
}

export interface Configurations {
  /** The auth mode of current system, such as "db_auth", "ldap_auth", "oidc_auth" */
  auth_mode?: string;
  /** The flag to indicate whether the current auth mode should consider as a primary one. */
  primary_auth_mode?: boolean | null;
  /** The Base DN for LDAP binding. */
  ldap_base_dn?: string;
  /** The filter for LDAP search */
  ldap_filter?: string;
  /** The base DN to search LDAP group. */
  ldap_group_base_dn?: string;
  /** Specify the ldap group which have the same privilege with Harbor admin */
  ldap_group_admin_dn?: string;
  /** The attribute which is used as identity of the LDAP group, default is cn.' */
  ldap_group_attribute_name?: string;
  /** The filter to search the ldap group */
  ldap_group_search_filter?: string;
  /** The scope to search ldap group. ''0-LDAP_SCOPE_BASE, 1-LDAP_SCOPE_ONELEVEL, 2-LDAP_SCOPE_SUBTREE'' */
  ldap_group_search_scope?: number;
  /** The scope to search ldap users,'0-LDAP_SCOPE_BASE, 1-LDAP_SCOPE_ONELEVEL, 2-LDAP_SCOPE_SUBTREE' */
  ldap_scope?: number;
  /** The DN of the user to do the search. */
  ldap_search_dn?: string;
  /** The password of the ldap search dn */
  ldap_search_password?: string;
  /** Timeout in seconds for connection to LDAP server */
  ldap_timeout?: number;
  /** The attribute which is used as identity for the LDAP binding, such as "CN" or "SAMAccountname" */
  ldap_uid?: string;
  /** The URL of LDAP server */
  ldap_url?: string;
  /** Whether verify your OIDC server certificate, disable it if your OIDC server is hosted via self-hosted certificate. */
  ldap_verify_cert?: boolean;
  /** The user attribute to identify the group membership */
  ldap_group_membership_attribute?: string;
  /** Indicate who can create projects, it could be ''adminonly'' or ''everyone''. */
  project_creation_restriction?: string;
  /** The flag to indicate whether Harbor is in readonly mode. */
  read_only?: boolean;
  /** Whether the Harbor instance supports self-registration.  If it''s set to false, admin need to add user to the instance. */
  self_registration?: boolean;
  /** The expiration time of the token for internal Registry, in minutes. */
  token_expiration?: number;
  /** The client id of UAA */
  uaa_client_id?: string;
  /** The client secret of the UAA */
  uaa_client_secret?: string;
  /** The endpoint of the UAA */
  uaa_endpoint?: string;
  /** Verify the certificate in UAA server */
  uaa_verify_cert?: boolean;
  /** The endpoint of the HTTP auth */
  http_authproxy_endpoint?: string;
  /** The token review endpoint */
  http_authproxy_tokenreview_endpoint?: string;
  /** The group which has the harbor admin privileges */
  http_authproxy_admin_groups?: string;
  /** The username which has the harbor admin privileges */
  http_authproxy_admin_usernames?: string;
  /** Verify the HTTP auth provider's certificate */
  http_authproxy_verify_cert?: boolean;
  /** Search user before onboard */
  http_authproxy_skip_search?: boolean;
  /** The certificate of the HTTP auth provider */
  http_authproxy_server_certificate?: string;
  /** The OIDC provider name */
  oidc_name?: string;
  /** The endpoint of the OIDC provider */
  oidc_endpoint?: string;
  /** The client ID of the OIDC provider */
  oidc_client_id?: string;
  /** The OIDC provider secret */
  oidc_client_secret?: string;
  /** The attribute claims the group name */
  oidc_groups_claim?: string;
  /** The OIDC group which has the harbor admin privileges */
  oidc_admin_group?: string;
  /** The OIDC group filter which filters out the group name doesn't match the regular expression */
  oidc_group_filter?: string;
  /** The scope of the OIDC provider */
  oidc_scope?: string;
  /** The attribute claims the username */
  oidc_user_claim?: string;
  /** Verify the OIDC provider's certificate' */
  oidc_verify_cert?: boolean;
  /** Auto onboard the OIDC user */
  oidc_auto_onboard?: boolean;
  /** Extra parameters to add when redirect request to OIDC provider */
  oidc_extra_redirect_parms?: string;
  /** The robot account token duration in days */
  robot_token_duration?: number;
  /** The rebot account name prefix */
  robot_name_prefix?: string;
  /** Enable notification */
  notification_enable?: boolean;
  /** Enable quota per project */
  quota_per_project_enable?: boolean;
  /** The storage quota per project */
  storage_per_project?: number;
  /** The audit log forward endpoint */
  audit_log_forward_endpoint?: string;
  /** Skip audit log database */
  skip_audit_log_database?: boolean;
  /** The session timeout for harbor, in minutes. */
  session_timeout?: number;
  /** Whether or not to skip update pull time for scanner */
  scanner_skip_update_pulltime?: boolean;
  /** The banner message for the UI.It is the stringified result of the banner message object */
  banner_message?: string;
}

export interface StringConfigItem {
  /** The string value of current config item */
  value: string;
  /** The configure item can be updated or not */
  editable: boolean;
}

export interface BoolConfigItem {
  /** The boolean value of current config item */
  value: boolean;
  /** The configure item can be updated or not */
  editable: boolean;
}

export interface IntegerConfigItem {
  /** The integer value of current config item */
  value: number;
  /** The configure item can be updated or not */
  editable: boolean;
}

export interface ProjectMemberEntity {
  /** the project member id */
  id?: number;
  /** the project id */
  project_id?: number;
  /** the name of the group member. */
  entity_name?: string;
  /** the name of the role */
  role_name?: string;
  /** the role id */
  role_id?: number;
  /** the id of entity, if the member is a user, it is user_id in user table. if the member is a user group, it is the user group's ID in user_group table. */
  entity_id?: number;
  /** the entity's type, u for user entity, g for group entity. */
  entity_type?: string;
}

export interface ProjectMember {
  /** The role id 1 for projectAdmin, 2 for developer, 3 for guest, 4 for maintainer */
  role_id?: number;
  member_user?: UserEntity;
  member_group?: UserGroup;
}

export interface RoleRequest {
  /** The role id 1 for projectAdmin, 2 for developer, 3 for guest, 4 for maintainer */
  role_id?: number;
}

export interface UserEntity {
  /** The ID of the user. */
  user_id?: number;
  /** The name of the user. */
  username?: string;
}

export interface UserProfile {
  email?: string;
  realname?: string;
  comment?: string;
}

export interface UserCreationReq {
  /** @maxLength 255 */
  email?: string;
  realname?: string;
  comment?: string;
  password?: string;
  /** @maxLength 255 */
  username?: string;
}

export interface OIDCUserInfo {
  /**
   * the ID of the OIDC info record
   * @format int
   */
  id?: number;
  /**
   * the ID of the user
   * @format int
   */
  user_id?: number;
  /** the concatenation of sub and issuer in the ID token */
  subiss?: string;
  /** the secret of the OIDC user that can be used for CLI to push/pull artifacts */
  secret?: string;
  /**
   * The creation time of the OIDC user info record.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the OIDC user info record.
   * @format date-time
   */
  update_time?: string;
}

export interface UserResp {
  email?: string;
  realname?: string;
  comment?: string;
  /** @format int */
  user_id?: number;
  username?: string;
  sysadmin_flag: boolean;
  /** indicate the admin privilege is grant by authenticator (LDAP), is always false unless it is the current login user */
  admin_role_in_auth: boolean;
  oidc_user_meta?: OIDCUserInfo;
  /**
   * The creation time of the user.
   * @format date-time
   */
  creation_time?: string;
  /**
   * The update time of the user.
   * @format date-time
   */
  update_time?: string;
}

export interface UserSysAdminFlag {
  /** true-admin, false-not admin. */
  sysadmin_flag?: boolean;
}

export interface UserSearch {
  /**
   * The ID of the user.
   * @format int
   */
  user_id?: number;
  username?: string;
}

export interface PasswordReq {
  /** The user's existing password. */
  old_password?: string;
  /** New password for marking as to be updated. */
  new_password?: string;
}

export interface UserSearchRespItem {
  /**
   * The ID of the user.
   * @format int
   */
  user_id?: number;
  username?: string;
}

export interface Permission {
  /** The permission resoruce */
  resource?: string;
  /** The permission action */
  action?: string;
}

export interface OIDCCliSecretReq {
  /** The new secret */
  secret?: string;
}

/** The system health status */
export interface OverallHealthStatus {
  /** The overall health status. It is "healthy" only when all the components' status are "healthy" */
  status?: string;
  components?: ComponentHealthStatus[];
}

/** The health status of component */
export interface ComponentHealthStatus {
  /** The component name */
  name?: string;
  /** The health status of component. Is either "healthy" or "unhealthy". */
  status?: string;
  /** (optional) The error message when the status is "unhealthy" */
  error?: string;
}

export interface Statistic {
  /**
   * The count of the private projects
   * @format int64
   */
  private_project_count: number;
  /**
   * The count of the private repositories
   * @format int64
   */
  private_repo_count: number;
  /**
   * The count of the public projects
   * @format int64
   */
  public_project_count: number;
  /**
   * The count of the public repositories
   * @format int64
   */
  public_repo_count: number;
  /**
   * The count of the total projects, only be seen by the system admin
   * @format int64
   */
  total_project_count: number;
  /**
   * The count of the total repositories, only be seen by the system admin
   * @format int64
   */
  total_repo_count: number;
  /**
   * The total storage consumption of blobs, only be seen by the system admin
   * @format int64
   */
  total_storage_consumption: number;
}

/** The accessory of the artifact */
export interface Accessory {
  /**
   * The ID of the accessory
   * @format int64
   */
  id?: number;
  /**
   * The artifact id of the accessory
   * @format int64
   */
  artifact_id: number;
  /**
   * Going to be deprecated, use repo and digest for insteand. The subject artifact id of the accessory.
   * @format int64
   */
  subject_artifact_id?: number;
  /** The subject artifact digest of the accessory */
  subject_artifact_digest: string;
  /** The subject artifact repository name of the accessory */
  subject_artifact_repo: string;
  /**
   * The artifact size of the accessory
   * @format int64
   */
  size: number;
  /** The artifact digest of the accessory */
  digest: string;
  /** The artifact size of the accessory */
  type: string;
  /** The icon of the accessory */
  icon: string;
  /**
   * The creation time of the accessory
   * @format date-time
   */
  creation_time?: string;
}

/** The criteria to select the scan data to export. */
export interface ScanDataExportRequest {
  /** Name of the scan data export job */
  job_name?: string;
  /** A list of one or more projects for which to export the scan data, currently only one project is supported due to performance concerns, but define as array for extension in the future. */
  projects?: number[];
  /** A list of one or more labels for which to export the scan data, defaults to all if empty */
  labels?: number[];
  /** A list of repositories for which to export the scan data, defaults to all if empty */
  repositories?: string;
  /** CVE-IDs for which to export data. Multiple CVE-IDs can be specified by separating using ',' and enclosed between '{}'. Defaults to all if empty */
  cveIds?: string;
  /** A list of tags enclosed within '{}'. Defaults to all if empty */
  tags?: string;
}

/** The metadata associated with the scan data export job */
export interface ScanDataExportJob {
  /**
   * The id of the scan data export job
   * @format int64
   */
  id?: number;
}

/** The replication execution */
export interface ScanDataExportExecution {
  /** The ID of the execution */
  id?: number;
  /** The ID if the user triggering the export job */
  user_id?: number;
  /** The status of the execution */
  status?: string;
  /** The trigger mode */
  trigger?: string;
  /**
   * The start time
   * @format date-time
   */
  start_time?: string;
  /**
   * The end time
   * @format date-time
   */
  end_time?: string;
  /** The status text */
  status_text: string;
  /** The name of the user triggering the job */
  user_name: string;
  /** Indicates whether the export artifact is present in registry */
  file_present: boolean;
}

/** The list of scan data export executions */
export interface ScanDataExportExecutionList {
  /** The list of scan data export executions */
  items?: ScanDataExportExecution[];
}

/** the worker pool of job service */
export interface WorkerPool {
  /** the process id of jobservice */
  pid?: number;
  /** the id of the worker pool */
  worker_pool_id?: string;
  /**
   * The start time of the work pool
   * @format date-time
   */
  start_at?: string;
  /**
   * The heartbeat time of the work pool
   * @format date-time
   */
  heartbeat_at?: string;
  /** The concurrency of the work pool */
  concurrency?: number;
  /** The host of the work pool */
  host?: string;
}

/** worker in the pool */
export interface Worker {
  /** the id of the worker */
  id?: string;
  /** the id of the worker pool */
  pool_id?: string;
  /** the name of the running job in the worker */
  job_name?: string;
  /** the id of the running job in the worker */
  job_id?: string;
  /**
   * The start time of the worker
   * @format date-time
   */
  start_at?: string | null;
  /** the checkin of the running job in the worker */
  check_in?: string;
  /**
   * The checkin time of the worker
   * @format date-time
   */
  checkin_at?: string | null;
}

/** The request to stop, pause or resume */
export interface ActionRequest {
  /** The action of the request, should be stop, pause or resume */
  action?: "stop" | "pause" | "resume";
}

/** the job queue info */
export interface JobQueue {
  /** The type of the job queue */
  job_type?: string;
  /** The count of jobs in the job queue */
  count?: number;
  /** The latency the job queue (seconds) */
  latency?: number;
  /** The paused status of the job queue */
  paused: boolean;
}

/** the schedule task info */
export interface ScheduleTask {
  /** the id of the Schedule task */
  id?: number;
  /** the vendor type of the current schedule task */
  vendor_type?: string;
  /** the vendor id of the current task */
  vendor_id?: number;
  /** the cron of the current schedule task */
  cron?: string;
  /**
   * the update time of the schedule task
   * @format date-time
   */
  update_time?: string;
}

/** the scheduler status */
export interface SchedulerStatus {
  /** if the scheduler is paused */
  paused: boolean;
}

/** the security summary */
export interface SecuritySummary {
  /**
   * the count of critical vulnerabilities
   * @format int64
   */
  critical_cnt: number;
  /**
   * the count of high vulnerabilities
   * @format int64
   */
  high_cnt?: number;
  /**
   * the count of medium vulnerabilities
   * @format int64
   */
  medium_cnt: number;
  /**
   * the count of low vulnerabilities
   * @format int64
   */
  low_cnt: number;
  /**
   * the count of none vulnerabilities
   * @format int64
   */
  none_cnt?: number;
  /**
   * the count of unknown vulnerabilities
   * @format int64
   */
  unknown_cnt?: number;
  /**
   * the count of total vulnerabilities
   * @format int64
   */
  total_vuls: number;
  /**
   * the count of scanned artifacts
   * @format int64
   */
  scanned_cnt: number;
  /**
   * the total count of artifacts
   * @format int64
   */
  total_artifact: number;
  /**
   * the count of fixable vulnerabilities
   * @format int64
   */
  fixable_cnt: number;
  /** the list of dangerous CVEs */
  dangerous_cves?: DangerousCVE[];
  /** the list of dangerous artifacts */
  dangerous_artifacts?: DangerousArtifact[];
}

/** the dangerous CVE information */
export interface DangerousCVE {
  /** the cve id */
  cve_id?: string;
  /** the severity of the CVE */
  severity?: string;
  /**
   * the cvss score v3
   * @format float64
   */
  cvss_score_v3?: number;
  /** the description of the CVE */
  desc?: string;
  /** the package of the CVE */
  package?: string;
  /** the version of the package */
  version?: string;
}

/** the dangerous artifact information */
export interface DangerousArtifact {
  /**
   * the project id of the artifact
   * @format int64
   */
  project_id?: number;
  /** the repository name of the artifact */
  repository_name?: string;
  /** the digest of the artifact */
  digest?: string;
  /** the count of critical vulnerabilities */
  critical_cnt: number;
  /**
   * the count of high vulnerabilities
   * @format int64
   */
  high_cnt: number;
  /** the count of medium vulnerabilities */
  medium_cnt: number;
}

/** the vulnerability item info */
export interface VulnerabilityItem {
  /**
   * the project ID of the artifact
   * @format int64
   */
  project_id?: number;
  /** the repository name of the artifact */
  repository_name?: string;
  /** the digest of the artifact */
  digest?: string;
  /** the tags of the artifact */
  tags?: string[];
  /** the CVE id of the vulnerability. */
  cve_id?: string;
  /** the severity of the vulnerability */
  severity?: string;
  /**
   * the nvd cvss v3 score of the vulnerability
   * @format float
   */
  cvss_v3_score?: number;
  /** the package of the vulnerability */
  package?: string;
  /** the version of the package */
  version?: string;
  /** the fixed version of the package */
  fixed_version?: string;
  /** The description of the vulnerability */
  desc?: string;
  /** Links of the vulnerability */
  links?: string[];
}

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, HeadersDefaults, ResponseType } from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || "http://localhost/api/v2.0" });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === "object") {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title Harbor API
 * @version 2.0
 * @baseUrl http://localhost/api/v2.0
 *
 * These APIs provide services for manipulating Harbor project.
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  health = {
    /**
     * @description Check the status of Harbor components. This path does not require authentication.
     *
     * @tags health
     * @name GetHealth
     * @summary Check the status of Harbor components
     * @request GET:/health
     * @secure
     */
    getHealth: (params: RequestParams = {}) =>
      this.request<OverallHealthStatus, Errors>({
        path: `/health`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  search = {
    /**
     * @description The Search endpoint returns information about the projects and repositories offered at public status or related to the current logged in user. The response includes the project and repository list in a proper display order.
     *
     * @tags search
     * @name Search
     * @summary Search for projects and repositories
     * @request GET:/search
     * @secure
     */
    search: (
      query: {
        /** Search parameter for project and repository name. */
        q: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Search, Errors>({
        path: `/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  statistics = {
    /**
     * @description Get the statistic information about the projects and repositories
     *
     * @tags statistic
     * @name GetStatistic
     * @summary Get the statistic information about the projects and repositories
     * @request GET:/statistics
     * @secure
     */
    getStatistic: (params: RequestParams = {}) =>
      this.request<Statistic, Errors>({
        path: `/statistics`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ldap = {
    /**
     * @description This endpoint ping the available ldap service for test related configuration parameters.
     *
     * @tags Ldap
     * @name PingLdap
     * @summary Ping available ldap service.
     * @request POST:/ldap/ping
     * @secure
     */
    pingLdap: (ldapconf: LdapConf, params: RequestParams = {}) =>
      this.request<LdapPingResult, Errors>({
        path: `/ldap/ping`,
        method: "POST",
        body: ldapconf,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint searches the available ldap users based on related configuration parameters. Support searched by input ladp configuration, load configuration from the system and specific filter.
     *
     * @tags Ldap
     * @name SearchLdapUser
     * @summary Search available ldap users.
     * @request GET:/ldap/users/search
     * @secure
     */
    searchLdapUser: (
      query?: {
        /** Registered user ID */
        username?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<LdapUser[], Errors>({
        path: `/ldap/users/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint adds the selected available ldap users to harbor based on related configuration parameters from the system. System will try to guess the user email address and realname, add to harbor user information. If have errors when import user, will return the list of importing failed uid and the failed reason.
     *
     * @tags Ldap
     * @name ImportLdapUser
     * @summary Import selected available ldap users.
     * @request POST:/ldap/users/import
     * @secure
     */
    importLdapUser: (uid_list: LdapImportUsers, params: RequestParams = {}) =>
      this.request<void, Errors | LdapFailedImportUser[]>({
        path: `/ldap/users/import`,
        method: "POST",
        body: uid_list,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint searches the available ldap groups based on related configuration parameters. support to search by groupname or groupdn.
     *
     * @tags Ldap
     * @name SearchLdapGroup
     * @summary Search available ldap groups.
     * @request GET:/ldap/groups/search
     * @secure
     */
    searchLdapGroup: (
      query?: {
        /** Ldap group name */
        groupname?: string;
        /** The LDAP group DN */
        groupdn?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserGroup[], Errors>({
        path: `/ldap/groups/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  internalconfig = {
    /**
     * @description This endpoint is for retrieving system configurations that only provides for internal api call.
     *
     * @tags configure
     * @name GetInternalconfig
     * @summary Get internal configurations.
     * @request GET:/internalconfig
     * @secure
     */
    getInternalconfig: (params: RequestParams = {}) =>
      this.request<InternalConfigurationsResponse, void>({
        path: `/internalconfig`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  configurations = {
    /**
     * @description This endpoint is for retrieving system configurations that only provides for admin user.
     *
     * @tags configure
     * @name GetConfigurations
     * @summary Get system configurations.
     * @request GET:/configurations
     * @secure
     */
    getConfigurations: (params: RequestParams = {}) =>
      this.request<ConfigurationsResponse, void>({
        path: `/configurations`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for modifying system configurations that only provides for admin user.
     *
     * @tags configure
     * @name UpdateConfigurations
     * @summary Modify system configurations.
     * @request PUT:/configurations
     * @secure
     */
    updateConfigurations: (configurations: Configurations, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/configurations`,
        method: "PUT",
        body: configurations,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  projects = {
    /**
     * @description This endpoint returns projects created by Harbor.
     *
     * @tags project
     * @name ListProjects
     * @summary List projects
     * @request GET:/projects
     * @secure
     */
    listProjects: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /** The name of project. */
        name?: string;
        /** The project is public or private. */
        public?: boolean;
        /** The name of project owner. */
        owner?: string;
        /**
         * Bool value indicating whether return detailed information of the project
         * @default true
         */
        with_detail?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Project[], Errors>({
        path: `/projects`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is used to check if the project name provided already exist.
     *
     * @tags project
     * @name HeadProject
     * @summary Check if the project name user provided already exists.
     * @request HEAD:/projects
     * @secure
     */
    headProject: (
      query: {
        /** Project name for checking exists. */
        project_name: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects`,
        method: "HEAD",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is for user to create a new project.
     *
     * @tags project
     * @name CreateProject
     * @summary Create a new project.
     * @request POST:/projects
     * @secure
     */
    createProject: (project: ProjectReq, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects`,
        method: "POST",
        body: project,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint returns specific project information by project ID.
     *
     * @tags project
     * @name GetProject
     * @summary Return specific project detail information
     * @request GET:/projects/{project_name_or_id}
     * @secure
     */
    getProject: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<Project, Errors>({
        path: `/projects/${projectNameOrId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is aimed to update the properties of a project.
     *
     * @tags project
     * @name UpdateProject
     * @summary Update properties for a selected project.
     * @request PUT:/projects/{project_name_or_id}
     * @secure
     */
    updateProject: (projectNameOrId: string, project: ProjectReq, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}`,
        method: "PUT",
        body: project,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint is aimed to delete project by project ID.
     *
     * @tags project
     * @name DeleteProject
     * @summary Delete project by projectID
     * @request DELETE:/projects/{project_name_or_id}
     * @secure
     */
    deleteProject: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Get the deletable status of the project
     *
     * @tags project
     * @name GetProjectDeletable
     * @summary Get the deletable status of the project
     * @request GET:/projects/{project_name_or_id}/_deletable
     * @secure
     */
    getProjectDeletable: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<ProjectDeletable, Errors>({
        path: `/projects/${projectNameOrId}/_deletable`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get summary of the project.
     *
     * @tags project
     * @name GetProjectSummary
     * @summary Get summary of the project.
     * @request GET:/projects/{project_name_or_id}/summary
     * @secure
     */
    getProjectSummary: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<ProjectSummary, Errors>({
        path: `/projects/${projectNameOrId}/summary`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get all project member information
     *
     * @tags member
     * @name ListProjectMembers
     * @summary Get all project member information
     * @request GET:/projects/{project_name_or_id}/members
     * @secure
     */
    listProjectMembers: (
      projectNameOrId: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** The entity name to search. */
        entityname?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProjectMemberEntity[], Errors>({
        path: `/projects/${projectNameOrId}/members`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create project member relationship, the member can be one of the user_member and group_member,  The user_member need to specify user_id or username. If the user already exist in harbor DB, specify the user_id,  If does not exist in harbor DB, it will SearchAndOnBoard the user. The group_member need to specify id or ldap_group_dn. If the group already exist in harbor DB. specify the user group's id,  If does not exist, it will SearchAndOnBoard the group.
     *
     * @tags member
     * @name CreateProjectMember
     * @summary Create project member
     * @request POST:/projects/{project_name_or_id}/members
     * @secure
     */
    createProjectMember: (projectNameOrId: string, project_member: ProjectMember, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/projects/${projectNameOrId}/members`,
        method: "POST",
        body: project_member,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get the project member information
     *
     * @tags member
     * @name GetProjectMember
     * @summary Get the project member information
     * @request GET:/projects/{project_name_or_id}/members/{mid}
     * @secure
     */
    getProjectMember: (projectNameOrId: string, mid: number, params: RequestParams = {}) =>
      this.request<ProjectMemberEntity, Errors>({
        path: `/projects/${projectNameOrId}/members/${mid}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update project member relationship
     *
     * @tags member
     * @name UpdateProjectMember
     * @summary Update project member
     * @request PUT:/projects/{project_name_or_id}/members/{mid}
     * @secure
     */
    updateProjectMember: (projectNameOrId: string, mid: number, role: RoleRequest, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/members/${mid}`,
        method: "PUT",
        body: role,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags member
     * @name DeleteProjectMember
     * @summary Delete project member
     * @request DELETE:/projects/{project_name_or_id}/members/{mid}
     * @secure
     */
    deleteProjectMember: (projectNameOrId: string, mid: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/members/${mid}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Get the metadata of the specific project
     *
     * @tags projectMetadata
     * @name ListProjectMetadatas
     * @summary Get the metadata of the specific project
     * @request GET:/projects/{project_name_or_id}/metadatas/
     * @secure
     */
    listProjectMetadatas: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<Annotations, Errors>({
        path: `/projects/${projectNameOrId}/metadatas/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Add metadata for the specific project
     *
     * @tags projectMetadata
     * @name AddProjectMetadatas
     * @summary Add metadata for the specific project
     * @request POST:/projects/{project_name_or_id}/metadatas/
     * @secure
     */
    addProjectMetadatas: (projectNameOrId: string, metadata: Metadata, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/metadatas/`,
        method: "POST",
        body: metadata,
        secure: true,
        ...params,
      }),

    /**
     * @description Get the specific metadata of the specific project
     *
     * @tags projectMetadata
     * @name GetProjectMetadata
     * @summary Get the specific metadata of the specific project
     * @request GET:/projects/{project_name_or_id}/metadatas/{meta_name}
     * @secure
     */
    getProjectMetadata: (projectNameOrId: string, metaName: string, params: RequestParams = {}) =>
      this.request<Annotations, Errors>({
        path: `/projects/${projectNameOrId}/metadatas/${metaName}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update the specific metadata for the specific project
     *
     * @tags projectMetadata
     * @name UpdateProjectMetadata
     * @summary Update the specific metadata for the specific project
     * @request PUT:/projects/{project_name_or_id}/metadatas/{meta_name}
     * @secure
     */
    updateProjectMetadata: (
      projectNameOrId: string,
      metaName: string,
      metadata: Record<string, string>,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/metadatas/${metaName}`,
        method: "PUT",
        body: metadata,
        secure: true,
        ...params,
      }),

    /**
     * @description Delete the specific metadata for the specific project
     *
     * @tags projectMetadata
     * @name DeleteProjectMetadata
     * @summary Delete the specific metadata for the specific project
     * @request DELETE:/projects/{project_name_or_id}/metadatas/{meta_name}
     * @secure
     */
    deleteProjectMetadata: (projectNameOrId: string, metaName: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/metadatas/${metaName}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description List repositories of the specified project
     *
     * @tags repository
     * @name ListRepositories
     * @summary List repositories
     * @request GET:/projects/{project_name}/repositories
     * @secure
     */
    listRepositories: (
      projectName: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Repository[], Errors>({
        path: `/projects/${projectName}/repositories`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the repository specified by name
     *
     * @tags repository
     * @name GetRepository
     * @summary Get repository
     * @request GET:/projects/{project_name}/repositories/{repository_name}
     * @secure
     */
    getRepository: (projectName: string, repositoryName: string, params: RequestParams = {}) =>
      this.request<Repository, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update the repository specified by name
     *
     * @tags repository
     * @name UpdateRepository
     * @summary Update repository
     * @request PUT:/projects/{project_name}/repositories/{repository_name}
     * @secure
     */
    updateRepository: (
      projectName: string,
      repositoryName: string,
      repository: Repository,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}`,
        method: "PUT",
        body: repository,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Delete the repository specified by name
     *
     * @tags repository
     * @name DeleteRepository
     * @summary Delete repository
     * @request DELETE:/projects/{project_name}/repositories/{repository_name}
     * @secure
     */
    deleteRepository: (projectName: string, repositoryName: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description List artifacts under the specific project and repository. Except the basic properties, the other supported queries in "q" includes "tags=*" to list only tagged artifacts, "tags=nil" to list only untagged artifacts, "tags=~v" to list artifacts whose tag fuzzy matches "v", "tags=v" to list artifact whose tag exactly matches "v", "labels=(id1, id2)" to list artifacts that both labels with id1 and id2 are added to
     *
     * @tags artifact
     * @name ListArtifacts
     * @summary List artifacts
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts
     * @secure
     */
    listArtifacts: (
      projectName: string,
      repositoryName: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /**
         * Specify whether the tags are included inside the returning artifacts
         * @default true
         */
        with_tag?: boolean;
        /**
         * Specify whether the labels are included inside the returning artifacts
         * @default false
         */
        with_label?: boolean;
        /**
         * Specify whether the scan overview is included inside the returning artifacts
         * @default false
         */
        with_scan_overview?: boolean;
        /**
         * Specify whether the signature is included inside the tags of the returning artifacts. Only works when setting "with_tag=true"
         * @default false
         */
        with_signature?: boolean;
        /**
         * Specify whether the immutable status is included inside the tags of the returning artifacts. Only works when setting "with_immutable_status=true"
         * @default false
         */
        with_immutable_status?: boolean;
        /**
         * Specify whether the accessories are included of the returning artifacts. Only works when setting "with_accessory=true"
         * @default false
         */
        with_accessory?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Artifact[], Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Copy the artifact specified in the "from" parameter to the repository.
     *
     * @tags artifact
     * @name CopyArtifact
     * @summary Copy artifact
     * @request POST:/projects/{project_name}/repositories/{repository_name}/artifacts
     * @secure
     */
    copyArtifact: (
      projectName: string,
      repositoryName: string,
      query: {
        /** The artifact from which the new artifact is copied from, the format should be "project/repository:tag" or "project/repository@digest". */
        from: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts`,
        method: "POST",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * @description Get the artifact specified by the reference under the project and repository. The reference can be digest or tag.
     *
     * @tags artifact
     * @name GetArtifact
     * @summary Get the specific artifact
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}
     * @secure
     */
    getArtifact: (
      projectName: string,
      repositoryName: string,
      reference: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /**
         * Specify whether the tags are inclued inside the returning artifacts
         * @default true
         */
        with_tag?: boolean;
        /**
         * Specify whether the labels are inclued inside the returning artifacts
         * @default false
         */
        with_label?: boolean;
        /**
         * Specify whether the scan overview is inclued inside the returning artifacts
         * @default false
         */
        with_scan_overview?: boolean;
        /**
         * Specify whether the accessories are included of the returning artifacts.
         * @default false
         */
        with_accessory?: boolean;
        /**
         * Specify whether the signature is inclued inside the returning artifacts
         * @default false
         */
        with_signature?: boolean;
        /**
         * Specify whether the immutable status is inclued inside the tags of the returning artifacts.
         * @default false
         */
        with_immutable_status?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Artifact, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the artifact specified by the reference under the project and repository. The reference can be digest or tag
     *
     * @tags artifact
     * @name DeleteArtifact
     * @summary Delete the specific artifact
     * @request DELETE:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}
     * @secure
     */
    deleteArtifact: (projectName: string, repositoryName: string, reference: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Scan the specified artifact
     *
     * @tags scan
     * @name ScanArtifact
     * @summary Scan the artifact
     * @request POST:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/scan
     * @secure
     */
    scanArtifact: (projectName: string, repositoryName: string, reference: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/scan`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * @description Cancelling a scan job for a particular artifact
     *
     * @tags scan
     * @name StopScanArtifact
     * @summary Cancelling a scan job for a particular artifact
     * @request POST:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/scan/stop
     * @secure
     */
    stopScanArtifact: (projectName: string, repositoryName: string, reference: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/scan/stop`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * @description Get the log of the scan report
     *
     * @tags scan
     * @name GetReportLog
     * @summary Get the log of the scan report
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/scan/{report_id}/log
     * @secure
     */
    getReportLog: (
      projectName: string,
      repositoryName: string,
      reference: string,
      reportId: string,
      params: RequestParams = {},
    ) =>
      this.request<EventType, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/scan/${reportId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Create a tag for the specified artifact
     *
     * @tags artifact
     * @name CreateTag
     * @summary Create tag
     * @request POST:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/tags
     * @secure
     */
    createTag: (projectName: string, repositoryName: string, reference: string, tag: Tag, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/tags`,
        method: "POST",
        body: tag,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description List tags of the specific artifact
     *
     * @tags artifact
     * @name ListTags
     * @summary List tags
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/tags
     * @secure
     */
    listTags: (
      projectName: string,
      repositoryName: string,
      reference: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /**
         * Specify whether the signature is included inside the returning tags
         * @default false
         */
        with_signature?: boolean;
        /**
         * Specify whether the immutable status is included inside the returning tags
         * @default false
         */
        with_immutable_status?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Tag[], Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/tags`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the tag of the specified artifact
     *
     * @tags artifact
     * @name DeleteTag
     * @summary Delete tag
     * @request DELETE:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/tags/{tag_name}
     * @secure
     */
    deleteTag: (
      projectName: string,
      repositoryName: string,
      reference: string,
      tagName: string,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/tags/${tagName}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description List accessories of the specific artifact
     *
     * @tags artifact
     * @name ListAccessories
     * @summary List accessories
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/accessories
     * @secure
     */
    listAccessories: (
      projectName: string,
      repositoryName: string,
      reference: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Accessory[], Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/accessories`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the vulnerabilities addition of the artifact specified by the reference under the project and repository.
     *
     * @tags artifact
     * @name GetVulnerabilitiesAddition
     * @summary Get the vulnerabilities addition of the specific artifact
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/additions/vulnerabilities
     * @secure
     */
    getVulnerabilitiesAddition: (
      projectName: string,
      repositoryName: string,
      reference: string,
      params: RequestParams = {},
    ) =>
      this.request<EventType, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/additions/vulnerabilities`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the addition of the artifact specified by the reference under the project and repository.
     *
     * @tags artifact
     * @name GetAddition
     * @summary Get the addition of the specific artifact
     * @request GET:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/additions/{addition}
     * @secure
     */
    getAddition: (
      projectName: string,
      repositoryName: string,
      reference: string,
      addition: "build_history" | "values.yaml" | "readme.md" | "dependencies",
      params: RequestParams = {},
    ) =>
      this.request<EventType, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/additions/${addition}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Add label to the specified artiact.
     *
     * @tags artifact
     * @name AddLabel
     * @summary Add label to artifact
     * @request POST:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/labels
     * @secure
     */
    addLabel: (
      projectName: string,
      repositoryName: string,
      reference: string,
      label: Label,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/labels`,
        method: "POST",
        body: label,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Remove the label from the specified artiact.
     *
     * @tags artifact
     * @name RemoveLabel
     * @summary Remove label from artifact
     * @request DELETE:/projects/{project_name}/repositories/{repository_name}/artifacts/{reference}/labels/{label_id}
     * @secure
     */
    removeLabel: (
      projectName: string,
      repositoryName: string,
      reference: string,
      labelId: number,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/repositories/${repositoryName}/artifacts/${reference}/labels/${labelId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Get the scanner registration of the specified project. If no scanner registration is configured for the specified project, the system default scanner registration will be returned.
     *
     * @tags project
     * @name GetScannerOfProject
     * @summary Get project level scanner
     * @request GET:/projects/{project_name_or_id}/scanner
     * @secure
     */
    getScannerOfProject: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<ScannerRegistration, void>({
        path: `/projects/${projectNameOrId}/scanner`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Set one of the system configured scanner registration as the indepndent scanner of the specified project.
     *
     * @tags project
     * @name SetScannerOfProject
     * @summary Configure scanner for the specified project
     * @request PUT:/projects/{project_name_or_id}/scanner
     * @secure
     */
    setScannerOfProject: (projectNameOrId: string, payload: ProjectScanner, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/scanner`,
        method: "PUT",
        body: payload,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Retrieve the system configured scanner registrations as candidates of setting project level scanner.
     *
     * @tags project
     * @name ListScannerCandidatesOfProject
     * @summary Get scanner registration candidates for configurating project level scanner
     * @request GET:/projects/{project_name_or_id}/scanner/candidates
     * @secure
     */
    listScannerCandidatesOfProject: (
      projectNameOrId: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ScannerRegistration[], Errors>({
        path: `/projects/${projectNameOrId}/scanner/candidates`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get recent logs of the projects
     *
     * @tags project
     * @name GetLogs
     * @summary Get recent logs of the projects
     * @request GET:/projects/{project_name}/logs
     * @secure
     */
    getLogs: (
      projectName: string,
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<AuditLog[], Errors>({
        path: `/projects/${projectName}/logs`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a preheat policy under a project
     *
     * @tags preheat
     * @name CreatePolicy
     * @summary Create a preheat policy under a project
     * @request POST:/projects/{project_name}/preheat/policies
     * @secure
     */
    createPolicy: (projectName: string, policy: PreheatPolicy, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/preheat/policies`,
        method: "POST",
        body: policy,
        secure: true,
        ...params,
      }),

    /**
     * @description List preheat policies
     *
     * @tags preheat
     * @name ListPolicies
     * @summary List preheat policies
     * @request GET:/projects/{project_name}/preheat/policies
     * @secure
     */
    listPolicies: (
      projectName: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<PreheatPolicy[], Errors>({
        path: `/projects/${projectName}/preheat/policies`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a preheat policy
     *
     * @tags preheat
     * @name GetPolicy
     * @summary Get a preheat policy
     * @request GET:/projects/{project_name}/preheat/policies/{preheat_policy_name}
     * @secure
     */
    getPolicy: (projectName: string, preheatPolicyName: string, params: RequestParams = {}) =>
      this.request<PreheatPolicy, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update preheat policy
     *
     * @tags preheat
     * @name UpdatePolicy
     * @summary Update preheat policy
     * @request PUT:/projects/{project_name}/preheat/policies/{preheat_policy_name}
     * @secure
     */
    updatePolicy: (projectName: string, preheatPolicyName: string, policy: PreheatPolicy, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}`,
        method: "PUT",
        body: policy,
        secure: true,
        ...params,
      }),

    /**
     * @description Manual preheat
     *
     * @tags preheat
     * @name ManualPreheat
     * @summary Manual preheat
     * @request POST:/projects/{project_name}/preheat/policies/{preheat_policy_name}
     * @secure
     */
    manualPreheat: (
      projectName: string,
      preheatPolicyName: string,
      policy: PreheatPolicy,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}`,
        method: "POST",
        body: policy,
        secure: true,
        ...params,
      }),

    /**
     * @description Delete a preheat policy
     *
     * @tags preheat
     * @name DeletePolicy
     * @summary Delete a preheat policy
     * @request DELETE:/projects/{project_name}/preheat/policies/{preheat_policy_name}
     * @secure
     */
    deletePolicy: (projectName: string, preheatPolicyName: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description List executions for the given policy
     *
     * @tags preheat
     * @name ListExecutions
     * @summary List executions for the given policy
     * @request GET:/projects/{project_name}/preheat/policies/{preheat_policy_name}/executions
     * @secure
     */
    listExecutions: (
      projectName: string,
      preheatPolicyName: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Execution[], Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}/executions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a execution detail by id
     *
     * @tags preheat
     * @name GetExecution
     * @summary Get a execution detail by id
     * @request GET:/projects/{project_name}/preheat/policies/{preheat_policy_name}/executions/{execution_id}
     * @secure
     */
    getExecution: (projectName: string, preheatPolicyName: string, executionId: number, params: RequestParams = {}) =>
      this.request<Execution, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}/executions/${executionId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop a execution
     *
     * @tags preheat
     * @name StopExecution
     * @summary Stop a execution
     * @request PATCH:/projects/{project_name}/preheat/policies/{preheat_policy_name}/executions/{execution_id}
     * @secure
     */
    stopExecution: (
      projectName: string,
      preheatPolicyName: string,
      executionId: number,
      execution: Execution,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}/executions/${executionId}`,
        method: "PATCH",
        body: execution,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description List all the related tasks for the given execution
     *
     * @tags preheat
     * @name ListTasks
     * @summary List all the related tasks for the given execution
     * @request GET:/projects/{project_name}/preheat/policies/{preheat_policy_name}/executions/{execution_id}/tasks
     * @secure
     */
    listTasks: (
      projectName: string,
      preheatPolicyName: string,
      executionId: number,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Task[], Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}/executions/${executionId}/tasks`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the log text stream of the specified task for the given execution
     *
     * @tags preheat
     * @name GetPreheatLog
     * @summary Get the log text stream of the specified task for the given execution
     * @request GET:/projects/{project_name}/preheat/policies/{preheat_policy_name}/executions/{execution_id}/tasks/{task_id}/logs
     * @secure
     */
    getPreheatLog: (
      projectName: string,
      preheatPolicyName: string,
      executionId: number,
      taskId: number,
      params: RequestParams = {},
    ) =>
      this.request<EventType, Errors>({
        path: `/projects/${projectName}/preheat/policies/${preheatPolicyName}/executions/${executionId}/tasks/${taskId}/logs`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Get all providers at project level
     *
     * @tags preheat
     * @name ListProvidersUnderProject
     * @summary Get all providers at project level
     * @request GET:/projects/{project_name}/preheat/providers
     * @secure
     */
    listProvidersUnderProject: (projectName: string, params: RequestParams = {}) =>
      this.request<ProviderUnderProject[], Errors>({
        path: `/projects/${projectName}/preheat/providers`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get all robot accounts of specified project
     *
     * @tags robotv1
     * @name ListRobotV1
     * @summary Get all robot accounts of specified project
     * @request GET:/projects/{project_name_or_id}/robots
     * @secure
     */
    listRobotV1: (
      projectNameOrId: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Robot[], Errors>({
        path: `/projects/${projectNameOrId}/robots`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a robot account
     *
     * @tags robotv1
     * @name CreateRobotV1
     * @summary Create a robot account
     * @request POST:/projects/{project_name_or_id}/robots
     * @secure
     */
    createRobotV1: (projectNameOrId: string, robot: RobotCreateV1, params: RequestParams = {}) =>
      this.request<RobotCreated, Errors>({
        path: `/projects/${projectNameOrId}/robots`,
        method: "POST",
        body: robot,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint returns specific robot account information by robot ID.
     *
     * @tags robotv1
     * @name GetRobotByIdv1
     * @summary Get a robot account
     * @request GET:/projects/{project_name_or_id}/robots/{robot_id}
     * @secure
     */
    getRobotByIdv1: (projectNameOrId: string, robotId: number, params: RequestParams = {}) =>
      this.request<Robot, Errors>({
        path: `/projects/${projectNameOrId}/robots/${robotId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Used to disable/enable a specified robot account.
     *
     * @tags robotv1
     * @name UpdateRobotV1
     * @summary Update status of robot account.
     * @request PUT:/projects/{project_name_or_id}/robots/{robot_id}
     * @secure
     */
    updateRobotV1: (projectNameOrId: string, robotId: number, robot: Robot, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/robots/${robotId}`,
        method: "PUT",
        body: robot,
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint deletes specific robot account information by robot ID.
     *
     * @tags robotv1
     * @name DeleteRobotV1
     * @summary Delete a robot account
     * @request DELETE:/projects/{project_name_or_id}/robots/{robot_id}
     * @secure
     */
    deleteRobotV1: (projectNameOrId: string, robotId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/robots/${robotId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint returns the immutable tag rules of a project
     *
     * @tags immutable
     * @name ListImmuRules
     * @summary List all immutable tag rules of current project
     * @request GET:/projects/{project_name_or_id}/immutabletagrules
     * @secure
     */
    listImmuRules: (
      projectNameOrId: string,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ImmutableRule[], Errors>({
        path: `/projects/${projectNameOrId}/immutabletagrules`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint add an immutable tag rule to the project
     *
     * @tags immutable
     * @name CreateImmuRule
     * @summary Add an immutable tag rule to current project
     * @request POST:/projects/{project_name_or_id}/immutabletagrules
     * @secure
     */
    createImmuRule: (projectNameOrId: string, ImmutableRule: ImmutableRule, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/immutabletagrules`,
        method: "POST",
        body: ImmutableRule,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags immutable
     * @name UpdateImmuRule
     * @summary Update the immutable tag rule or enable or disable the rule
     * @request PUT:/projects/{project_name_or_id}/immutabletagrules/{immutable_rule_id}
     * @secure
     */
    updateImmuRule: (
      projectNameOrId: string,
      immutableRuleId: number,
      ImmutableRule: ImmutableRule,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/immutabletagrules/${immutableRuleId}`,
        method: "PUT",
        body: ImmutableRule,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags immutable
     * @name DeleteImmuRule
     * @summary Delete the immutable tag rule.
     * @request DELETE:/projects/{project_name_or_id}/immutabletagrules/{immutable_rule_id}
     * @secure
     */
    deleteImmuRule: (projectNameOrId: string, immutableRuleId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/immutabletagrules/${immutableRuleId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint returns webhook policies of a project.
     *
     * @tags webhook
     * @name ListWebhookPoliciesOfProject
     * @summary List project webhook policies.
     * @request GET:/projects/{project_name_or_id}/webhook/policies
     * @secure
     */
    listWebhookPoliciesOfProject: (
      projectNameOrId: string,
      query?: {
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<WebhookPolicy[], Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint create a webhook policy if the project does not have one.
     *
     * @tags webhook
     * @name CreateWebhookPolicyOfProject
     * @summary Create project webhook policy.
     * @request POST:/projects/{project_name_or_id}/webhook/policies
     * @secure
     */
    createWebhookPolicyOfProject: (projectNameOrId: string, policy: WebhookPolicy, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies`,
        method: "POST",
        body: policy,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint returns specified webhook policy of a project.
     *
     * @tags webhook
     * @name GetWebhookPolicyOfProject
     * @summary Get project webhook policy
     * @request GET:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}
     * @secure
     */
    getWebhookPolicyOfProject: (projectNameOrId: string, webhookPolicyId: number, params: RequestParams = {}) =>
      this.request<WebhookPolicy, Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is aimed to update the webhook policy of a project.
     *
     * @tags webhook
     * @name UpdateWebhookPolicyOfProject
     * @summary Update webhook policy of a project.
     * @request PUT:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}
     * @secure
     */
    updateWebhookPolicyOfProject: (
      projectNameOrId: string,
      webhookPolicyId: number,
      policy: WebhookPolicy,
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}`,
        method: "PUT",
        body: policy,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint is aimed to delete webhookpolicy of a project.
     *
     * @tags webhook
     * @name DeleteWebhookPolicyOfProject
     * @summary Delete webhook policy of a project
     * @request DELETE:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}
     * @secure
     */
    deleteWebhookPolicyOfProject: (projectNameOrId: string, webhookPolicyId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint returns the executions of a specific webhook policy.
     *
     * @tags webhook
     * @name ListExecutionsOfWebhookPolicy
     * @summary List executions for a specific webhook policy
     * @request GET:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}/executions
     * @secure
     */
    listExecutionsOfWebhookPolicy: (
      projectNameOrId: string,
      webhookPolicyId: number,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Execution[], Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}/executions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint returns the tasks of a specific webhook execution.
     *
     * @tags webhook
     * @name ListTasksOfWebhookExecution
     * @summary List tasks for a specific webhook execution
     * @request GET:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}/executions/{execution_id}/tasks
     * @secure
     */
    listTasksOfWebhookExecution: (
      projectNameOrId: string,
      webhookPolicyId: number,
      executionId: number,
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Task[], Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}/executions/${executionId}/tasks`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint returns the logs of a specific webhook task.
     *
     * @tags webhook
     * @name GetLogsOfWebhookTask
     * @summary Get logs for a specific webhook task
     * @request GET:/projects/{project_name_or_id}/webhook/policies/{webhook_policy_id}/executions/{execution_id}/tasks/{task_id}/log
     * @secure
     */
    getLogsOfWebhookTask: (
      projectNameOrId: string,
      webhookPolicyId: number,
      executionId: number,
      taskId: number,
      params: RequestParams = {},
    ) =>
      this.request<EventType, Errors>({
        path: `/projects/${projectNameOrId}/webhook/policies/${webhookPolicyId}/executions/${executionId}/tasks/${taskId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint returns last trigger information of project webhook policy.
     *
     * @tags webhook
     * @name LastTrigger
     * @summary Get project webhook policy last trigger info
     * @request GET:/projects/{project_name_or_id}/webhook/lasttrigger
     * @deprecated
     * @secure
     */
    lastTrigger: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<WebhookLastTrigger[], Errors>({
        path: `/projects/${projectNameOrId}/webhook/lasttrigger`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint returns webhook jobs of a project.
     *
     * @tags webhookjob
     * @name ListWebhookJobs
     * @summary List project webhook jobs
     * @request GET:/projects/{project_name_or_id}/webhook/jobs
     * @deprecated
     * @secure
     */
    listWebhookJobs: (
      projectNameOrId: string,
      query: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /**
         * The policy ID.
         * @format int64
         */
        policy_id: number;
        /** The status of webhook job. */
        status?: string[];
      },
      params: RequestParams = {},
    ) =>
      this.request<WebhookJob[], Errors>({
        path: `/projects/${projectNameOrId}/webhook/jobs`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get supported event types and notify types.
     *
     * @tags webhook
     * @name GetSupportedEventTypes
     * @summary Get supported event types and notify types.
     * @request GET:/projects/{project_name_or_id}/webhook/events
     * @secure
     */
    getSupportedEventTypes: (projectNameOrId: string, params: RequestParams = {}) =>
      this.request<SupportedWebhookEventTypes, Errors>({
        path: `/projects/${projectNameOrId}/webhook/events`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  repositories = {
    /**
     * @description List all authorized repositories
     *
     * @tags repository
     * @name ListAllRepositories
     * @summary List all authorized repositories
     * @request GET:/repositories
     * @secure
     */
    listAllRepositories: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Repository[], Errors>({
        path: `/repositories`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  auditLogs = {
    /**
     * @description This endpoint let user see the recent operation logs of the projects which he is member of
     *
     * @tags auditlog
     * @name ListAuditLogs
     * @summary Get recent logs of the projects which the user is a member of
     * @request GET:/audit-logs
     * @secure
     */
    listAuditLogs: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<AuditLog[], Errors>({
        path: `/audit-logs`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  p2P = {
    /**
     * @description List P2P providers
     *
     * @tags preheat
     * @name ListProviders
     * @summary List P2P providers
     * @request GET:/p2p/preheat/providers
     * @secure
     */
    listProviders: (params: RequestParams = {}) =>
      this.request<Metadata[], Errors>({
        path: `/p2p/preheat/providers`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint checks status of a instance, the instance can be given by ID or Endpoint URL (together with credential)
     *
     * @tags preheat
     * @name PingInstances
     * @summary Ping status of a instance.
     * @request POST:/p2p/preheat/instances/ping
     * @secure
     */
    pingInstances: (instance: Instance, params: RequestParams = {}) =>
      this.request<any, Errors | void>({
        path: `/p2p/preheat/instances/ping`,
        method: "POST",
        body: instance,
        secure: true,
        ...params,
      }),

    /**
     * @description List P2P provider instances
     *
     * @tags preheat
     * @name ListInstances
     * @summary List P2P provider instances
     * @request GET:/p2p/preheat/instances
     * @secure
     */
    listInstances: (
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Instance[], Errors>({
        path: `/p2p/preheat/instances`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create p2p provider instances
     *
     * @tags preheat
     * @name CreateInstance
     * @summary Create p2p provider instances
     * @request POST:/p2p/preheat/instances
     * @secure
     */
    createInstance: (instance: Instance, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/p2p/preheat/instances`,
        method: "POST",
        body: instance,
        secure: true,
        ...params,
      }),

    /**
     * @description Get a P2P provider instance
     *
     * @tags preheat
     * @name GetInstance
     * @summary Get a P2P provider instance
     * @request GET:/p2p/preheat/instances/{preheat_instance_name}
     * @secure
     */
    getInstance: (preheatInstanceName: string, params: RequestParams = {}) =>
      this.request<Instance, Errors>({
        path: `/p2p/preheat/instances/${preheatInstanceName}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the specified P2P provider instance
     *
     * @tags preheat
     * @name DeleteInstance
     * @summary Delete the specified P2P provider instance
     * @request DELETE:/p2p/preheat/instances/{preheat_instance_name}
     * @secure
     */
    deleteInstance: (preheatInstanceName: string, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/p2p/preheat/instances/${preheatInstanceName}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Update the specified P2P provider instance
     *
     * @tags preheat
     * @name UpdateInstance
     * @summary Update the specified P2P provider instance
     * @request PUT:/p2p/preheat/instances/{preheat_instance_name}
     * @secure
     */
    updateInstance: (preheatInstanceName: string, instance: Instance, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/p2p/preheat/instances/${preheatInstanceName}`,
        method: "PUT",
        body: instance,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  usergroups = {
    /**
     * @description Get all user groups information, it is open for system admin
     *
     * @tags usergroup
     * @name ListUserGroups
     * @summary Get all user groups information
     * @request GET:/usergroups
     * @secure
     */
    listUserGroups: (
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** search with ldap group DN */
        ldap_group_dn?: string;
        /** group name need to search, fuzzy matches */
        group_name?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserGroup[], Errors>({
        path: `/usergroups`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create user group information
     *
     * @tags usergroup
     * @name CreateUserGroup
     * @summary Create user group
     * @request POST:/usergroups
     * @secure
     */
    createUserGroup: (usergroup: UserGroup, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/usergroups`,
        method: "POST",
        body: usergroup,
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is to search groups by group name.  It's open for all authenticated requests.
     *
     * @tags usergroup
     * @name SearchUserGroups
     * @summary Search groups by groupname
     * @request GET:/usergroups/search
     * @secure
     */
    searchUserGroups: (
      query: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Group name for filtering results. */
        groupname: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserGroupSearchItem[], Errors>({
        path: `/usergroups/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get user group information
     *
     * @tags usergroup
     * @name GetUserGroup
     * @summary Get user group information
     * @request GET:/usergroups/{group_id}
     * @secure
     */
    getUserGroup: (groupId: number, params: RequestParams = {}) =>
      this.request<UserGroup, Errors>({
        path: `/usergroups/${groupId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update user group information
     *
     * @tags usergroup
     * @name UpdateUserGroup
     * @summary Update group information
     * @request PUT:/usergroups/{group_id}
     * @secure
     */
    updateUserGroup: (groupId: number, usergroup: UserGroup, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/usergroups/${groupId}`,
        method: "PUT",
        body: usergroup,
        secure: true,
        ...params,
      }),

    /**
     * @description Delete user group
     *
     * @tags usergroup
     * @name DeleteUserGroup
     * @summary Delete user group
     * @request DELETE:/usergroups/{group_id}
     * @secure
     */
    deleteUserGroup: (groupId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/usergroups/${groupId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  icons = {
    /**
     * @description Get the artifact icon with the specified digest. As the original icon image is resized and encoded before returning, the parameter "digest" in the path doesn't match the hash of the returned content
     *
     * @tags icon
     * @name GetIcon
     * @summary Get artifact icon
     * @request GET:/icons/{digest}
     * @secure
     */
    getIcon: (digest: string, params: RequestParams = {}) =>
      this.request<Icon, Errors>({
        path: `/icons/${digest}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  robots = {
    /**
     * @description List the robot accounts with the specified level and project.
     *
     * @tags robot
     * @name ListRobot
     * @summary Get robot account
     * @request GET:/robots
     * @secure
     */
    listRobot: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Robot[], Errors>({
        path: `/robots`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a robot account
     *
     * @tags robot
     * @name CreateRobot
     * @summary Create a robot account
     * @request POST:/robots
     * @secure
     */
    createRobot: (robot: RobotCreate, params: RequestParams = {}) =>
      this.request<RobotCreated, Errors>({
        path: `/robots`,
        method: "POST",
        body: robot,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint returns specific robot account information by robot ID.
     *
     * @tags robot
     * @name GetRobotById
     * @summary Get a robot account
     * @request GET:/robots/{robot_id}
     * @secure
     */
    getRobotById: (robotId: number, params: RequestParams = {}) =>
      this.request<Robot, Errors>({
        path: `/robots/${robotId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint updates specific robot account information by robot ID.
     *
     * @tags robot
     * @name UpdateRobot
     * @summary Update a robot account
     * @request PUT:/robots/{robot_id}
     * @secure
     */
    updateRobot: (robotId: number, robot: Robot, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/robots/${robotId}`,
        method: "PUT",
        body: robot,
        secure: true,
        ...params,
      }),

    /**
     * @description Refresh the robot secret
     *
     * @tags robot
     * @name RefreshSec
     * @summary Refresh the robot secret
     * @request PATCH:/robots/{robot_id}
     * @secure
     */
    refreshSec: (robotId: number, robotSec: RobotSec, params: RequestParams = {}) =>
      this.request<RobotSec, Errors>({
        path: `/robots/${robotId}`,
        method: "PATCH",
        body: robotSec,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint deletes specific robot account information by robot ID.
     *
     * @tags robot
     * @name DeleteRobot
     * @summary Delete a robot account
     * @request DELETE:/robots/{robot_id}
     * @secure
     */
    deleteRobot: (robotId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/robots/${robotId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  quotas = {
    /**
     * @description List quotas
     *
     * @tags quota
     * @name ListQuotas
     * @summary List quotas
     * @request GET:/quotas
     * @secure
     */
    listQuotas: (
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** The reference type of quota. */
        reference?: string;
        /** The reference id of quota. */
        reference_id?: string;
        /**
         * Sort method, valid values include:
         * 'hard.resource_name', '-hard.resource_name', 'used.resource_name', '-used.resource_name'.
         * Here '-' stands for descending order, resource_name should be the real resource name of the quota.
         */
        sort?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Quota[], Errors>({
        path: `/quotas`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the specified quota
     *
     * @tags quota
     * @name GetQuota
     * @summary Get the specified quota
     * @request GET:/quotas/{id}
     * @secure
     */
    getQuota: (id: number, params: RequestParams = {}) =>
      this.request<Quota, Errors>({
        path: `/quotas/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update hard limits of the specified quota
     *
     * @tags quota
     * @name UpdateQuota
     * @summary Update the specified quota
     * @request PUT:/quotas/{id}
     * @secure
     */
    updateQuota: (id: number, hard: QuotaUpdateReq, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/quotas/${id}`,
        method: "PUT",
        body: hard,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  replication = {
    /**
     * @description List replication policies
     *
     * @tags replication
     * @name ListReplicationPolicies
     * @summary List replication policies
     * @request GET:/replication/policies
     * @secure
     */
    listReplicationPolicies: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Deprecated, use "query" instead. The policy name. */
        name?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ReplicationPolicy[], Errors>({
        path: `/replication/policies`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a replication policy
     *
     * @tags replication
     * @name CreateReplicationPolicy
     * @summary Create a replication policy
     * @request POST:/replication/policies
     * @secure
     */
    createReplicationPolicy: (policy: ReplicationPolicy, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/replication/policies`,
        method: "POST",
        body: policy,
        secure: true,
        ...params,
      }),

    /**
     * @description Get the specific replication policy
     *
     * @tags replication
     * @name GetReplicationPolicy
     * @summary Get the specific replication policy
     * @request GET:/replication/policies/{id}
     * @secure
     */
    getReplicationPolicy: (id: number, params: RequestParams = {}) =>
      this.request<ReplicationPolicy, Errors>({
        path: `/replication/policies/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the specific replication policy
     *
     * @tags replication
     * @name DeleteReplicationPolicy
     * @summary Delete the specific replication policy
     * @request DELETE:/replication/policies/{id}
     * @secure
     */
    deleteReplicationPolicy: (id: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/replication/policies/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Update the replication policy
     *
     * @tags replication
     * @name UpdateReplicationPolicy
     * @summary Update the replication policy
     * @request PUT:/replication/policies/{id}
     * @secure
     */
    updateReplicationPolicy: (id: number, policy: ReplicationPolicy, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/replication/policies/${id}`,
        method: "PUT",
        body: policy,
        secure: true,
        ...params,
      }),

    /**
     * @description List replication executions
     *
     * @tags replication
     * @name ListReplicationExecutions
     * @summary List replication executions
     * @request GET:/replication/executions
     * @secure
     */
    listReplicationExecutions: (
      query?: {
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** The ID of the policy that the executions belong to. */
        policy_id?: number;
        /** The execution status. */
        status?: string;
        /** The trigger mode. */
        trigger?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ReplicationExecution[], Errors>({
        path: `/replication/executions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Start one replication execution according to the policy
     *
     * @tags replication
     * @name StartReplication
     * @summary Start one replication execution
     * @request POST:/replication/executions
     * @secure
     */
    startReplication: (execution: StartReplicationExecution, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/replication/executions`,
        method: "POST",
        body: execution,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get the replication execution specified by ID
     *
     * @tags replication
     * @name GetReplicationExecution
     * @summary Get the specific replication execution
     * @request GET:/replication/executions/{id}
     * @secure
     */
    getReplicationExecution: (id: number, params: RequestParams = {}) =>
      this.request<ReplicationExecution, Errors>({
        path: `/replication/executions/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop the replication execution specified by ID
     *
     * @tags replication
     * @name StopReplication
     * @summary Stop the specific replication execution
     * @request PUT:/replication/executions/{id}
     * @secure
     */
    stopReplication: (id: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/replication/executions/${id}`,
        method: "PUT",
        secure: true,
        ...params,
      }),

    /**
     * @description List replication tasks for a specific execution
     *
     * @tags replication
     * @name ListReplicationTasks
     * @summary List replication tasks for a specific execution
     * @request GET:/replication/executions/{id}/tasks
     * @secure
     */
    listReplicationTasks: (
      id: number,
      query?: {
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** The task status. */
        status?: string;
        /** The resource type. */
        resource_type?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ReplicationTask[], Errors>({
        path: `/replication/executions/${id}/tasks`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the log of the specific replication task
     *
     * @tags replication
     * @name GetReplicationLog
     * @summary Get the log of the specific replication task
     * @request GET:/replication/executions/{id}/tasks/{task_id}/log
     * @secure
     */
    getReplicationLog: (id: number, taskId: number, params: RequestParams = {}) =>
      this.request<EventType, Errors>({
        path: `/replication/executions/${id}/tasks/${taskId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description List registry adapters
     *
     * @tags registry
     * @name ListRegistryProviderTypes
     * @summary List registry adapters
     * @request GET:/replication/adapters
     * @secure
     */
    listRegistryProviderTypes: (params: RequestParams = {}) =>
      this.request<string[], Errors>({
        path: `/replication/adapters`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description List all registered registry provider information
     *
     * @tags registry
     * @name ListRegistryProviderInfos
     * @summary List all registered registry provider information
     * @request GET:/replication/adapterinfos
     * @secure
     */
    listRegistryProviderInfos: (params: RequestParams = {}) =>
      this.request<Record<string, RegistryProviderInfo>, Errors>({
        path: `/replication/adapterinfos`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  registries = {
    /**
     * @description Create a registry
     *
     * @tags registry
     * @name CreateRegistry
     * @summary Create a registry
     * @request POST:/registries
     * @secure
     */
    createRegistry: (registry: Registry, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/registries`,
        method: "POST",
        body: registry,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description List the registries
     *
     * @tags registry
     * @name ListRegistries
     * @summary List the registries
     * @request GET:/registries
     * @secure
     */
    listRegistries: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Deprecated, use `q` instead. */
        name?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<Registry[], Errors>({
        path: `/registries`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Check status of a registry
     *
     * @tags registry
     * @name PingRegistry
     * @summary Check status of a registry
     * @request POST:/registries/ping
     * @secure
     */
    pingRegistry: (registry: RegistryPing, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/registries/ping`,
        method: "POST",
        body: registry,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get the specific registry
     *
     * @tags registry
     * @name GetRegistry
     * @summary Get the specific registry
     * @request GET:/registries/{id}
     * @secure
     */
    getRegistry: (id: number, params: RequestParams = {}) =>
      this.request<Registry, Errors>({
        path: `/registries/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the specific registry
     *
     * @tags registry
     * @name DeleteRegistry
     * @summary Delete the specific registry
     * @request DELETE:/registries/{id}
     * @secure
     */
    deleteRegistry: (id: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/registries/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Update the registry
     *
     * @tags registry
     * @name UpdateRegistry
     * @summary Update the registry
     * @request PUT:/registries/{id}
     * @secure
     */
    updateRegistry: (id: number, registry: RegistryUpdate, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/registries/${id}`,
        method: "PUT",
        body: registry,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get the registry info
     *
     * @tags registry
     * @name GetRegistryInfo
     * @summary Get the registry info
     * @request GET:/registries/{id}/info
     * @secure
     */
    getRegistryInfo: (id: number, params: RequestParams = {}) =>
      this.request<RegistryInfo, Errors>({
        path: `/registries/${id}/info`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  scans = {
    /**
     * @description Get the metrics of the latest scan all process
     *
     * @tags scanAll
     * @name GetLatestScanAllMetrics
     * @summary Get the metrics of the latest scan all process
     * @request GET:/scans/all/metrics
     * @secure
     */
    getLatestScanAllMetrics: (params: RequestParams = {}) =>
      this.request<Stats, Errors>({
        path: `/scans/all/metrics`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the metrics of the latest scheduled scan all process
     *
     * @tags scanAll
     * @name GetLatestScheduledScanAllMetrics
     * @summary Get the metrics of the latest scheduled scan all process
     * @request GET:/scans/schedule/metrics
     * @deprecated
     * @secure
     */
    getLatestScheduledScanAllMetrics: (params: RequestParams = {}) =>
      this.request<Stats, Errors>({
        path: `/scans/schedule/metrics`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  systeminfo = {
    /**
     * @description This API is for retrieving general system info, this can be called by anonymous request.  Some attributes will be omitted in the response when this API is called by anonymous request.
     *
     * @tags systeminfo
     * @name GetSystemInfo
     * @summary Get general system info
     * @request GET:/systeminfo
     * @secure
     */
    getSystemInfo: (params: RequestParams = {}) =>
      this.request<GeneralInfo, Errors>({
        path: `/systeminfo`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for retrieving system volume info that only provides for admin user.  Note that the response only reflects the storage status of local disk.
     *
     * @tags systeminfo
     * @name GetVolumes
     * @summary Get system volume info (total/free size).
     * @request GET:/systeminfo/volumes
     * @secure
     */
    getVolumes: (params: RequestParams = {}) =>
      this.request<SystemInfo, Errors>({
        path: `/systeminfo/volumes`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for downloading a default root certificate.
     *
     * @tags systeminfo
     * @name GetCert
     * @summary Get default root certificate.
     * @request GET:/systeminfo/getcert
     * @secure
     */
    getCert: (params: RequestParams = {}) =>
      this.request<File, void | Errors>({
        path: `/systeminfo/getcert`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  system = {
    /**
     * @description Test the OIDC endpoint, the setting of the endpoint is provided in the request.  This API can only be called by system admin.
     *
     * @tags oidc
     * @name PingOidc
     * @summary Test the OIDC endpoint.
     * @request POST:/system/oidc/ping
     * @secure
     */
    pingOidc: (
      endpoint: {
        /** The URL of OIDC endpoint to be tested. */
        url?: string;
        /** Whether the certificate should be verified */
        verify_cert?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, Errors>({
        path: `/system/oidc/ping`,
        method: "POST",
        body: endpoint,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint let user get gc execution history.
     *
     * @tags gc
     * @name GetGcHistory
     * @summary Get gc results.
     * @request GET:/system/gc
     * @secure
     */
    getGcHistory: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<GCHistory[], Errors>({
        path: `/system/gc`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint let user get gc status filtered by specific ID.
     *
     * @tags gc
     * @name GetGc
     * @summary Get gc status.
     * @request GET:/system/gc/{gc_id}
     * @secure
     */
    getGc: (gcId: number, params: RequestParams = {}) =>
      this.request<GCHistory, Errors>({
        path: `/system/gc/${gcId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop the GC execution specified by ID
     *
     * @tags gc
     * @name StopGc
     * @summary Stop the specific GC execution
     * @request PUT:/system/gc/{gc_id}
     * @secure
     */
    stopGc: (gcId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/gc/${gcId}`,
        method: "PUT",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint let user get gc job logs filtered by specific ID.
     *
     * @tags gc
     * @name GetGcLog
     * @summary Get gc job log.
     * @request GET:/system/gc/{gc_id}/log
     * @secure
     */
    getGcLog: (gcId: number, params: RequestParams = {}) =>
      this.request<EventType, Errors>({
        path: `/system/gc/${gcId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is for get schedule of gc job.
     *
     * @tags gc
     * @name GetGcSchedule
     * @summary Get gc's schedule.
     * @request GET:/system/gc/schedule
     * @secure
     */
    getGcSchedule: (params: RequestParams = {}) =>
      this.request<GCHistory, Errors>({
        path: `/system/gc/schedule`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for update gc schedule.
     *
     * @tags gc
     * @name CreateGcSchedule
     * @summary Create a gc schedule.
     * @request POST:/system/gc/schedule
     * @secure
     */
    createGcSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/gc/schedule`,
        method: "POST",
        body: schedule,
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is for update gc schedule.
     *
     * @tags gc
     * @name UpdateGcSchedule
     * @summary Update gc's schedule.
     * @request PUT:/system/gc/schedule
     * @secure
     */
    updateGcSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/system/gc/schedule`,
        method: "PUT",
        body: schedule,
        secure: true,
        ...params,
      }),

    /**
     * @description get purge job execution history.
     *
     * @tags purge
     * @name GetPurgeHistory
     * @summary Get purge job results.
     * @request GET:/system/purgeaudit
     * @secure
     */
    getPurgeHistory: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ExecHistory[], Errors>({
        path: `/system/purgeaudit`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint let user get purge job status filtered by specific ID.
     *
     * @tags purge
     * @name GetPurgeJob
     * @summary Get purge job status.
     * @request GET:/system/purgeaudit/{purge_id}
     * @secure
     */
    getPurgeJob: (purgeId: number, params: RequestParams = {}) =>
      this.request<ExecHistory, Errors>({
        path: `/system/purgeaudit/${purgeId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop the purge audit log execution specified by ID
     *
     * @tags purge
     * @name StopPurge
     * @summary Stop the specific purge audit log execution
     * @request PUT:/system/purgeaudit/{purge_id}
     * @secure
     */
    stopPurge: (purgeId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/purgeaudit/${purgeId}`,
        method: "PUT",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint let user get purge job logs filtered by specific ID.
     *
     * @tags purge
     * @name GetPurgeJobLog
     * @summary Get purge job log.
     * @request GET:/system/purgeaudit/{purge_id}/log
     * @secure
     */
    getPurgeJobLog: (purgeId: number, params: RequestParams = {}) =>
      this.request<EventType, Errors>({
        path: `/system/purgeaudit/${purgeId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is for get schedule of purge job.
     *
     * @tags purge
     * @name GetPurgeSchedule
     * @summary Get purge's schedule.
     * @request GET:/system/purgeaudit/schedule
     * @secure
     */
    getPurgeSchedule: (params: RequestParams = {}) =>
      this.request<ExecHistory, Errors>({
        path: `/system/purgeaudit/schedule`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for update purge job schedule.
     *
     * @tags purge
     * @name CreatePurgeSchedule
     * @summary Create a purge job schedule.
     * @request POST:/system/purgeaudit/schedule
     * @secure
     */
    createPurgeSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/purgeaudit/schedule`,
        method: "POST",
        body: schedule,
        secure: true,
        ...params,
      }),

    /**
     * @description This endpoint is for update purge job schedule.
     *
     * @tags purge
     * @name UpdatePurgeSchedule
     * @summary Update purge job's schedule.
     * @request PUT:/system/purgeaudit/schedule
     * @secure
     */
    updatePurgeSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/system/purgeaudit/schedule`,
        method: "PUT",
        body: schedule,
        secure: true,
        ...params,
      }),

    /**
     * @description Get the system level allowlist of CVE.  This API can be called by all authenticated users.
     *
     * @tags SystemCVEAllowlist
     * @name GetSystemCveAllowlist
     * @summary Get the system level allowlist of CVE.
     * @request GET:/system/CVEAllowlist
     * @secure
     */
    getSystemCveAllowlist: (params: RequestParams = {}) =>
      this.request<CVEAllowlist, Errors>({
        path: `/system/CVEAllowlist`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This API overwrites the system level allowlist of CVE with the list in request body.  Only system Admin has permission to call this API.
     *
     * @tags SystemCVEAllowlist
     * @name PutSystemCveAllowlist
     * @summary Update the system level allowlist of CVE.
     * @request PUT:/system/CVEAllowlist
     * @secure
     */
    putSystemCveAllowlist: (allowlist: CVEAllowlist, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/system/CVEAllowlist`,
        method: "PUT",
        body: allowlist,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint is for getting a schedule for the scan all job, which scans all of images in Harbor.
     *
     * @tags scanAll
     * @name GetScanAllSchedule
     * @summary Get scan all's schedule.
     * @request GET:/system/scanAll/schedule
     * @secure
     */
    getScanAllSchedule: (params: RequestParams = {}) =>
      this.request<Schedule, Errors>({
        path: `/system/scanAll/schedule`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is for updating the schedule of scan all job, which scans all of images in Harbor.
     *
     * @tags scanAll
     * @name UpdateScanAllSchedule
     * @summary Update scan all's schedule.
     * @request PUT:/system/scanAll/schedule
     * @secure
     */
    updateScanAllSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/scanAll/schedule`,
        method: "PUT",
        body: schedule,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint is for creating a schedule or a manual trigger for the scan all job, which scans all of images in Harbor.
     *
     * @tags scanAll
     * @name CreateScanAllSchedule
     * @summary Create a schedule or a manual trigger for the scan all job.
     * @request POST:/system/scanAll/schedule
     * @secure
     */
    createScanAllSchedule: (schedule: Schedule, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/scanAll/schedule`,
        method: "POST",
        body: schedule,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Stop scanAll job execution
     *
     * @tags scanAll
     * @name StopScanAll
     * @summary Stop scanAll job execution
     * @request POST:/system/scanAll/stop
     * @secure
     */
    stopScanAll: (params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/system/scanAll/stop`,
        method: "POST",
        secure: true,
        ...params,
      }),
  };
  jobservice = {
    /**
     * @description Get worker pools
     *
     * @tags jobservice
     * @name GetWorkerPools
     * @summary Get worker pools
     * @request GET:/jobservice/pools
     * @secure
     */
    getWorkerPools: (params: RequestParams = {}) =>
      this.request<WorkerPool[], Errors>({
        path: `/jobservice/pools`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get workers in current pool
     *
     * @tags jobservice
     * @name GetWorkers
     * @summary Get workers
     * @request GET:/jobservice/pools/{pool_id}/workers
     * @secure
     */
    getWorkers: (poolId: string, params: RequestParams = {}) =>
      this.request<Worker[], Errors>({
        path: `/jobservice/pools/${poolId}/workers`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop running job
     *
     * @tags jobservice
     * @name StopRunningJob
     * @summary Stop running job
     * @request PUT:/jobservice/jobs/{job_id}
     * @secure
     */
    stopRunningJob: (jobId: string, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/jobservice/jobs/${jobId}`,
        method: "PUT",
        secure: true,
        ...params,
      }),

    /**
     * @description Get job log by job id, it is only used by administrator
     *
     * @tags jobservice
     * @name ActionGetJobLog
     * @summary Get job log by job id
     * @request GET:/jobservice/jobs/{job_id}/log
     * @secure
     */
    actionGetJobLog: (jobId: string, params: RequestParams = {}) =>
      this.request<EventType, Errors>({
        path: `/jobservice/jobs/${jobId}/log`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description list job queue
     *
     * @tags jobservice
     * @name ListJobQueues
     * @summary list job queues
     * @request GET:/jobservice/queues
     * @secure
     */
    listJobQueues: (params: RequestParams = {}) =>
      this.request<JobQueue[], Errors>({
        path: `/jobservice/queues`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description stop and clean, pause, resume pending jobs in the queue
     *
     * @tags jobservice
     * @name ActionPendingJobs
     * @summary stop and clean, pause, resume pending jobs in the queue
     * @request PUT:/jobservice/queues/{job_type}
     * @secure
     */
    actionPendingJobs: (jobType: string, action_request: ActionRequest, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/jobservice/queues/${jobType}`,
        method: "PUT",
        body: action_request,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  schedules = {
    /**
     * @description List schedules
     *
     * @tags schedule
     * @name ListSchedules
     * @request GET:/schedules
     * @secure
     */
    listSchedules: (
      query?: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ScheduleTask[], Errors>({
        path: `/schedules`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get scheduler paused status
     *
     * @tags schedule
     * @name GetSchedulePaused
     * @request GET:/schedules/{job_type}/paused
     * @secure
     */
    getSchedulePaused: (jobType: string, params: RequestParams = {}) =>
      this.request<SchedulerStatus, Errors>({
        path: `/schedules/${jobType}/paused`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ping = {
    /**
     * @description This API simply replies a pong to indicate the process to handle API is up, disregarding the health status of dependent components. This path does not require any authentication.
     *
     * @tags ping
     * @name GetPing
     * @summary Ping Harbor to check if the API server is alive.
     * @request GET:/ping
     * @secure
     */
    getPing: (params: RequestParams = {}) =>
      this.request<EventType, any>({
        path: `/ping`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  retentions = {
    /**
     * @description Get Retention Metadatas.
     *
     * @tags Retention
     * @name GetRentenitionMetadata
     * @summary Get Retention Metadatas
     * @request GET:/retentions/metadatas
     * @secure
     */
    getRentenitionMetadata: (params: RequestParams = {}) =>
      this.request<RetentionMetadata, any>({
        path: `/retentions/metadatas`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create Retention Policy, you can reference metadatas API for the policy model. You can check project metadatas to find whether a retention policy is already binded. This method should only be called when no retention policy binded to project yet.
     *
     * @tags Retention
     * @name CreateRetention
     * @summary Create Retention Policy
     * @request POST:/retentions
     * @secure
     */
    createRetention: (policy: RetentionPolicy, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/retentions`,
        method: "POST",
        body: policy,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get Retention Policy.
     *
     * @tags Retention
     * @name GetRetention
     * @summary Get Retention Policy
     * @request GET:/retentions/{id}
     * @secure
     */
    getRetention: (id: number, params: RequestParams = {}) =>
      this.request<RetentionPolicy, Errors>({
        path: `/retentions/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update Retention Policy, you can reference metadatas API for the policy model. You can check project metadatas to find whether a retention policy is already binded. This method should only be called when retention policy has already binded to project.
     *
     * @tags Retention
     * @name UpdateRetention
     * @summary Update Retention Policy
     * @request PUT:/retentions/{id}
     * @secure
     */
    updateRetention: (id: number, policy: RetentionPolicy, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/retentions/${id}`,
        method: "PUT",
        body: policy,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Delete Retention Policy, you can reference metadatas API for the policy model. You can check project metadatas to find whether a retention policy is already binded. This method should only be called when retention policy has already binded to project.
     *
     * @tags Retention
     * @name DeleteRetention
     * @summary Delete Retention Policy
     * @request DELETE:/retentions/{id}
     * @secure
     */
    deleteRetention: (id: number, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/retentions/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Trigger a Retention Execution, if dry_run is True, nothing would be deleted actually.
     *
     * @tags Retention
     * @name TriggerRetentionExecution
     * @summary Trigger a Retention Execution
     * @request POST:/retentions/{id}/executions
     * @secure
     */
    triggerRetentionExecution: (
      id: number,
      body: {
        dry_run?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, Errors>({
        path: `/retentions/${id}/executions`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get Retention executions, execution status may be delayed before job service schedule it up.
     *
     * @tags Retention
     * @name ListRetentionExecutions
     * @summary Get Retention executions
     * @request GET:/retentions/{id}/executions
     * @secure
     */
    listRetentionExecutions: (
      id: number,
      query?: {
        /**
         * The page number.
         * @format int64
         */
        page?: number;
        /**
         * The size of per page.
         * @format int64
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<RetentionExecution[], Errors>({
        path: `/retentions/${id}/executions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Stop a Retention execution, only support "stop" action now.
     *
     * @tags Retention
     * @name OperateRetentionExecution
     * @summary Stop a Retention execution
     * @request PATCH:/retentions/{id}/executions/{eid}
     * @secure
     */
    operateRetentionExecution: (
      id: number,
      eid: number,
      body: {
        action?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, Errors>({
        path: `/retentions/${id}/executions/${eid}`,
        method: "PATCH",
        body: body,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get Retention tasks, each repository as a task.
     *
     * @tags Retention
     * @name ListRetentionTasks
     * @summary Get Retention tasks
     * @request GET:/retentions/{id}/executions/{eid}/tasks
     * @secure
     */
    listRetentionTasks: (
      id: number,
      eid: number,
      query?: {
        /**
         * The page number.
         * @format int64
         */
        page?: number;
        /**
         * The size of per page.
         * @format int64
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<RetentionExecutionTask[], Errors>({
        path: `/retentions/${id}/executions/${eid}/tasks`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get Retention job task log, tags ratain or deletion detail will be shown in a table.
     *
     * @tags Retention
     * @name GetRetentionTaskLog
     * @summary Get Retention job task log
     * @request GET:/retentions/{id}/executions/{eid}/tasks/{tid}
     * @secure
     */
    getRetentionTaskLog: (id: number, eid: number, tid: number, params: RequestParams = {}) =>
      this.request<EventType, Errors>({
        path: `/retentions/${id}/executions/${eid}/tasks/${tid}`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  scanners = {
    /**
     * @description Returns a list of currently configured scanner registrations.
     *
     * @tags scanner
     * @name ListScanners
     * @summary List scanner registrations
     * @request GET:/scanners
     * @secure
     */
    listScanners: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ScannerRegistration[], Errors>({
        path: `/scanners`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Creats a new scanner registration with the given data.
     *
     * @tags scanner
     * @name CreateScanner
     * @summary Create a scanner registration
     * @request POST:/scanners
     * @secure
     */
    createScanner: (registration: ScannerRegistrationReq, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/scanners`,
        method: "POST",
        body: registration,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Pings scanner adapter to test endpoint URL and authorization settings.
     *
     * @tags scanner
     * @name PingScanner
     * @summary Tests scanner registration settings
     * @request POST:/scanners/ping
     * @secure
     */
    pingScanner: (settings: ScannerRegistrationSettings, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/scanners/ping`,
        method: "POST",
        body: settings,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Retruns the details of the specified scanner registration.
     *
     * @tags scanner
     * @name GetScanner
     * @summary Get a scanner registration details
     * @request GET:/scanners/{registration_id}
     * @secure
     */
    getScanner: (registrationId: string, params: RequestParams = {}) =>
      this.request<ScannerRegistration, Errors>({
        path: `/scanners/${registrationId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Updates the specified scanner registration.
     *
     * @tags scanner
     * @name UpdateScanner
     * @summary Update a scanner registration
     * @request PUT:/scanners/{registration_id}
     * @secure
     */
    updateScanner: (registrationId: string, registration: ScannerRegistrationReq, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/scanners/${registrationId}`,
        method: "PUT",
        body: registration,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Deletes the specified scanner registration.
     *
     * @tags scanner
     * @name DeleteScanner
     * @summary Delete a scanner registration
     * @request DELETE:/scanners/{registration_id}
     * @secure
     */
    deleteScanner: (registrationId: string, params: RequestParams = {}) =>
      this.request<ScannerRegistration, Errors>({
        path: `/scanners/${registrationId}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Set the specified scanner registration as the system default one.
     *
     * @tags scanner
     * @name SetScannerAsDefault
     * @summary Set system default scanner registration
     * @request PATCH:/scanners/{registration_id}
     * @secure
     */
    setScannerAsDefault: (registrationId: string, payload: IsDefault, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/scanners/${registrationId}`,
        method: "PATCH",
        body: payload,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Get the metadata of the specified scanner registration, including the capabilities and customized properties.
     *
     * @tags scanner
     * @name GetScannerMetadata
     * @summary Get the metadata of the specified scanner registration
     * @request GET:/scanners/{registration_id}/metadata
     * @secure
     */
    getScannerMetadata: (registrationId: string, params: RequestParams = {}) =>
      this.request<ScannerAdapterMetadata, Errors>({
        path: `/scanners/${registrationId}/metadata`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  users = {
    /**
     * No description
     *
     * @tags user
     * @name ListUsers
     * @summary List users
     * @request GET:/users
     * @secure
     */
    listUsers: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserResp[], Errors>({
        path: `/users`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This API can be used only when the authentication mode is for local DB.  When self registration is disabled.
     *
     * @tags user
     * @name CreateUser
     * @summary Create a local user.
     * @request POST:/users
     * @secure
     */
    createUser: (userReq: UserCreationReq, params: RequestParams = {}) =>
      this.request<any, Errors | void>({
        path: `/users`,
        method: "POST",
        body: userReq,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name GetCurrentUserInfo
     * @summary Get current user info.
     * @request GET:/users/current
     * @secure
     */
    getCurrentUserInfo: (params: RequestParams = {}) =>
      this.request<UserResp, Errors>({
        path: `/users/current`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint is to search the users by username.  It's open for all authenticated requests.
     *
     * @tags user
     * @name SearchUsers
     * @summary Search users by username
     * @request GET:/users/search
     * @secure
     */
    searchUsers: (
      query: {
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** Username for filtering results. */
        username: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserSearchRespItem[], Errors>({
        path: `/users/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name GetUser
     * @summary Get a user's profile.
     * @request GET:/users/{user_id}
     * @secure
     */
    getUser: (userId: number, params: RequestParams = {}) =>
      this.request<UserResp, Errors>({
        path: `/users/${userId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UpdateUserProfile
     * @summary Update user's profile.
     * @request PUT:/users/{user_id}
     * @secure
     */
    updateUserProfile: (userId: number, profile: UserProfile, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/users/${userId}`,
        method: "PUT",
        body: profile,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint let administrator of Harbor mark a registered user as removed.It actually won't be deleted from DB.
     *
     * @tags user
     * @name DeleteUser
     * @summary Mark a registered user as be removed.
     * @request DELETE:/users/{user_id}
     * @secure
     */
    deleteUser: (userId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/users/${userId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name SetUserSysAdmin
     * @summary Update a registered user to change to be an administrator of Harbor.
     * @request PUT:/users/{user_id}/sysadmin
     * @secure
     */
    setUserSysAdmin: (userId: number, sysadmin_flag: UserSysAdminFlag, params: RequestParams = {}) =>
      this.request<any, Errors | void>({
        path: `/users/${userId}/sysadmin`,
        method: "PUT",
        body: sysadmin_flag,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint is for user to update password. Users with the admin role can change any user's password. Regular users can change only their own password.
     *
     * @tags user
     * @name UpdateUserPassword
     * @summary Change the password on a user that already exists.
     * @request PUT:/users/{user_id}/password
     * @secure
     */
    updateUserPassword: (userId: number, password: PasswordReq, params: RequestParams = {}) =>
      this.request<any, void | Errors>({
        path: `/users/${userId}/password`,
        method: "PUT",
        body: password,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name GetCurrentUserPermissions
     * @summary Get current user permissions.
     * @request GET:/users/current/permissions
     * @secure
     */
    getCurrentUserPermissions: (
      query?: {
        /** The scope for the permission */
        scope?: string;
        /**
         * If true, the resources in the response are relative to the scope,
         * eg for resource '/project/1/repository' if relative is 'true' then the resource in response will be 'repository'.
         */
        relative?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<Permission[], void>({
        path: `/users/current/permissions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint let user generate a new CLI secret for himself.  This API only works when auth mode is set to 'OIDC'. Once this API returns with successful status, the old secret will be invalid, as there will be only one CLI secret for a user.
     *
     * @tags user
     * @name SetCliSecret
     * @summary Set CLI secret for a user.
     * @request PUT:/users/{user_id}/cli_secret
     * @secure
     */
    setCliSecret: (userId: number, secret: OIDCCliSecretReq, params: RequestParams = {}) =>
      this.request<void, void | Errors>({
        path: `/users/${userId}/cli_secret`,
        method: "PUT",
        body: secret,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),
  };
  labels = {
    /**
     * @description This endpoint let user list labels by name, scope and project_id
     *
     * @tags label
     * @name ListLabels
     * @summary List labels according to the query strings.
     * @request GET:/labels
     * @secure
     */
    listLabels: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /** Sort the resource list in ascending or descending order. e.g. sort by field1 in ascending orderr and field2 in descending order with "sort=field1,-field2" */
        sort?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /** The label name. */
        name?: string;
        /** The label scope. Valid values are g and p. g for global labels and p for project labels. */
        scope?: string;
        /**
         * Relevant project ID, required when scope is p.
         * @format int64
         */
        project_id?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<Label[], Errors>({
        path: `/labels`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint let user creates a label.
     *
     * @tags label
     * @name CreateLabel
     * @summary Post creates a label
     * @request POST:/labels
     * @secure
     */
    createLabel: (label: Label, params: RequestParams = {}) =>
      this.request<void, Errors>({
        path: `/labels`,
        method: "POST",
        body: label,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description This endpoint let user get the label by specific ID.
     *
     * @tags label
     * @name GetLabelById
     * @summary Get the label specified by ID.
     * @request GET:/labels/{label_id}
     * @secure
     */
    getLabelById: (labelId: number, params: RequestParams = {}) =>
      this.request<Label, Errors>({
        path: `/labels/${labelId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description This endpoint let user update label properties.
     *
     * @tags label
     * @name UpdateLabel
     * @summary Update the label properties.
     * @request PUT:/labels/{label_id}
     * @secure
     */
    updateLabel: (labelId: number, label: Label, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/labels/${labelId}`,
        method: "PUT",
        body: label,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Delete the label specified by ID.
     *
     * @tags label
     * @name DeleteLabel
     * @summary Delete the label specified by ID.
     * @request DELETE:/labels/{label_id}
     * @secure
     */
    deleteLabel: (labelId: number, params: RequestParams = {}) =>
      this.request<any, Errors>({
        path: `/labels/${labelId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
  export = {
    /**
     * @description Export scan data for selected projects
     *
     * @tags scan data export
     * @name ExportScanData
     * @summary Export scan data for selected projects
     * @request POST:/export/cve
     * @secure
     */
    exportScanData: (criteria: ScanDataExportRequest, params: RequestParams = {}) =>
      this.request<ScanDataExportJob, Errors>({
        path: `/export/cve`,
        method: "POST",
        body: criteria,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the scan data export execution specified by ID
     *
     * @tags scan data export
     * @name GetScanDataExportExecution
     * @summary Get the specific scan data export execution
     * @request GET:/export/cve/execution/{execution_id}
     * @secure
     */
    getScanDataExportExecution: (executionId: number, params: RequestParams = {}) =>
      this.request<ScanDataExportExecution, Errors>({
        path: `/export/cve/execution/${executionId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a list of specific scan data export execution jobs for a specified user
     *
     * @tags scan data export
     * @name GetScanDataExportExecutionList
     * @summary Get a list of specific scan data export execution jobs for a specified user
     * @request GET:/export/cve/executions
     * @secure
     */
    getScanDataExportExecutionList: (params: RequestParams = {}) =>
      this.request<ScanDataExportExecutionList, Errors>({
        path: `/export/cve/executions`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Download the scan data report. Default format is CSV
     *
     * @tags scan data export
     * @name DownloadScanData
     * @summary Download the scan data export file
     * @request GET:/export/cve/download/{execution_id}
     * @secure
     */
    downloadScanData: (
      executionId: number,
      query?: {
        /** The format of the data to be exported. e.g. CSV or PDF */
        format?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<File, Errors>({
        path: `/export/cve/download/${executionId}`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),
  };
  security = {
    /**
     * @description Retrieve the vulnerability summary of the system
     *
     * @tags securityhub
     * @name GetSecuritySummary
     * @summary Get vulnerability system summary
     * @request GET:/security/summary
     * @secure
     */
    getSecuritySummary: (
      query?: {
        /**
         * Specify whether the dangerous CVEs are included inside summary information
         * @default false
         */
        with_dangerous_cve?: boolean;
        /**
         * Specify whether the dangerous Artifact are included inside summary information
         * @default false
         */
        with_dangerous_artifact?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<SecuritySummary, Errors>({
        path: `/security/summary`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the vulnerability list. use q to pass the query condition, supported conditions: cve_id(exact match) cvss_score_v3(range condition) severity(exact match) repository_name(exact match) project_id(exact match) package(exact match) tag(exact match) digest(exact match)
     *
     * @tags securityhub
     * @name ListVulnerabilities
     * @summary Get the vulnerability list.
     * @request GET:/security/vul
     * @secure
     */
    listVulnerabilities: (
      query?: {
        /** Query string to query resources. Supported query patterns are "exact match(k=v)", "fuzzy match(k=~v)", "range(k=[min~max])", "list with union releationship(k={v1 v2 v3})" and "list with intersetion relationship(k=(v1 v2 v3))". The value of range and list can be string(enclosed by " or '), integer or time(in format "2020-04-09 02:36:00"). All of these query patterns should be put in the query string "q=xxx" and splitted by ",". e.g. q=k1=v1,k2=~v2,k3=[min~max] */
        q?: string;
        /**
         * The page number
         * @format int64
         * @default 1
         */
        page?: number;
        /**
         * The size of per page
         * @format int64
         * @max 100
         * @default 10
         */
        page_size?: number;
        /**
         * Enable to ignore X-Total-Count when the total count > 1000, if the total count is less than 1000, the real total count is returned, else -1.
         * @default false
         */
        tune_count?: boolean;
        /**
         * Specify whether the tag information is included inside vulnerability information
         * @default false
         */
        with_tag?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<VulnerabilityItem[], Errors>({
        path: `/security/vul`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
