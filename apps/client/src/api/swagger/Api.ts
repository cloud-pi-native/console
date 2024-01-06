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

import {
  Cluster,
  Environment,
  Organization,
  Permission,
  Project,
  Quota,
  QuotaStage,
  Repository,
  Role,
  Stage,
  User,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Api<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Retrieve active organizations
   *
   * @tags organization
   * @name V1OrganizationsList
   * @summary Retrieve active organizations
   * @request GET:/api/v1/organizations/
   */
  v1OrganizationsList = (params: RequestParams = {}) =>
    this.request<Organization[], any>({
      path: `/api/v1/organizations/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve clusters
   *
   * @tags cluster
   * @name V1ClustersList
   * @summary Retrieve clusters with filtered informations
   * @request GET:/api/v1/clusters/
   */
  v1ClustersList = (params: RequestParams = {}) =>
    this.request<Cluster[], any>({
      path: `/api/v1/clusters/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve quotas
   *
   * @tags quota
   * @name V1QuotasList
   * @summary Retrieve quotas, unfiltered list for admin
   * @request GET:/api/v1/quotas/
   */
  v1QuotasList = (params: RequestParams = {}) =>
    this.request<Quota[], any>({
      path: `/api/v1/quotas/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve stages
   *
   * @tags stage
   * @name V1StagesList
   * @summary Retrieve stages, unfiltered list for admin
   * @request GET:/api/v1/stages/
   */
  v1StagesList = (params: RequestParams = {}) =>
    this.request<Stage[], any>({
      path: `/api/v1/stages/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a user's projects
   *
   * @tags project
   * @name V1ProjectsList
   * @summary Retrieve a user's projects with further informations
   * @request GET:/api/v1/projects/
   */
  v1ProjectsList = (params: RequestParams = {}) =>
    this.request<
      (Project & {
        roles?: (Role & {
          user?: User;
        })[];
      })[],
      any
    >({
      path: `/api/v1/projects/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a new project
   *
   * @tags project
   * @name V1ProjectsCreate
   * @summary Create a new project
   * @request POST:/api/v1/projects/
   */
  v1ProjectsCreate = (
    body: {
      name: string;
      organizationId: string;
      description?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Project, any>({
      path: `/api/v1/projects/`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a project by its id
   *
   * @tags project
   * @name V1ProjectsDetail
   * @summary Retrieve a project by its id, with further informations
   * @request GET:/api/v1/projects/{projectId}
   */
  v1ProjectsDetail = (projectId: string, params: RequestParams = {}) =>
    this.request<Project, any>({
      path: `/api/v1/projects/${projectId}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Update project
   *
   * @tags project
   * @name V1ProjectsUpdate
   * @summary Update a project
   * @request PUT:/api/v1/projects/{projectId}
   */
  v1ProjectsUpdate = (
    projectId: string,
    body: {
      description?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Project, any>({
      path: `/api/v1/projects/${projectId}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Archive a project
   *
   * @tags project
   * @name V1ProjectsDelete
   * @summary Archive a project
   * @request DELETE:/api/v1/projects/{projectId}
   */
  v1ProjectsDelete = (projectId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/api/v1/projects/${projectId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve an environment by its id
   *
   * @tags environment
   * @name V1ProjectsEnvironmentsDetail
   * @summary Retrieve an environment by its id
   * @request GET:/api/v1/projects/{projectId}/environments/{environmentId}
   */
  v1ProjectsEnvironmentsDetail = (projectId: string, environmentId: string, params: RequestParams = {}) =>
    this.request<Environment, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Update an environment
   *
   * @tags environment
   * @name V1ProjectsEnvironmentsUpdate
   * @summary Update an environment
   * @request PUT:/api/v1/projects/{projectId}/environments/{environmentId}
   */
  v1ProjectsEnvironmentsUpdate = (
    projectId: string,
    environmentId: string,
    body: {
      quotaStageId?: string;
      clusterId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Environment, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Archive an environment
   *
   * @tags environment
   * @name V1ProjectsEnvironmentsDelete
   * @summary Archive an environment
   * @request DELETE:/api/v1/projects/{projectId}/environments/{environmentId}
   */
  v1ProjectsEnvironmentsDelete = (projectId: string, environmentId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Create a new environment
   *
   * @tags environment
   * @name V1ProjectsEnvironmentsCreate
   * @summary Create a new environment
   * @request POST:/api/v1/projects/{projectId}/environments
   */
  v1ProjectsEnvironmentsCreate = (
    projectId: string,
    body: {
      name: string;
      clusterId: string;
      quotaStageId: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Environment, any>({
      path: `/api/v1/projects/${projectId}/environments`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a repository by its id
   *
   * @tags repository
   * @name V1ProjectsRepositoriesDetail
   * @summary Retrieve a repository by its id
   * @request GET:/api/v1/projects/{projectId}/repositories/{repositoryId}
   */
  v1ProjectsRepositoriesDetail = (projectId: string, repositoryId: string, params: RequestParams = {}) =>
    this.request<Repository, any>({
      path: `/api/v1/projects/${projectId}/repositories/${repositoryId}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Update a repository
   *
   * @tags repository
   * @name V1ProjectsRepositoriesUpdate
   * @summary Update a repository
   * @request PUT:/api/v1/projects/{projectId}/repositories/{repositoryId}
   */
  v1ProjectsRepositoriesUpdate = (
    projectId: string,
    repositoryId: string,
    body: {
      externalRepoUrl?: string;
      isPrivate?: boolean;
      externalToken?: string;
      externalUserName?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Repository[], any>({
      path: `/api/v1/projects/${projectId}/repositories/${repositoryId}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete a repository
   *
   * @tags repository
   * @name V1ProjectsRepositoriesDelete
   * @summary Delete a repository
   * @request DELETE:/api/v1/projects/{projectId}/repositories/{repositoryId}
   */
  v1ProjectsRepositoriesDelete = (projectId: string, repositoryId: string, params: RequestParams = {}) =>
    this.request<string, any>({
      path: `/api/v1/projects/${projectId}/repositories/${repositoryId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a project's repositories
   *
   * @tags repository
   * @name V1ProjectsRepositoriesDetail2
   * @summary Retrieve a project's repositories
   * @request GET:/api/v1/projects/{projectId}/repositories
   * @originalName v1ProjectsRepositoriesDetail
   * @duplicate
   */
  v1ProjectsRepositoriesDetail2 = (projectId: string, params: RequestParams = {}) =>
    this.request<Repository[], any>({
      path: `/api/v1/projects/${projectId}/repositories`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a repository
   *
   * @tags repository
   * @name V1ProjectsRepositoriesCreate
   * @summary Create a repository
   * @request POST:/api/v1/projects/{projectId}/repositories
   */
  v1ProjectsRepositoriesCreate = (
    projectId: string,
    body: {
      internalRepoName: string;
      externalRepoUrl: string;
      externalUserName?: string;
      externalToken?: string;
      isInfra?: boolean;
      isPrivate?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<Repository[], any>({
      path: `/api/v1/projects/${projectId}/repositories`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a project's users
   *
   * @tags user
   * @name V1ProjectsUsersDetail
   * @summary Retrieve a project's users
   * @request GET:/api/v1/projects/{projectId}/users
   */
  v1ProjectsUsersDetail = (projectId: string, params: RequestParams = {}) =>
    this.request<User[], any>({
      path: `/api/v1/projects/${projectId}/users`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Add user to a project team
   *
   * @tags user
   * @name V1ProjectsUsersCreate
   * @summary Add user to a project team
   * @request POST:/api/v1/projects/{projectId}/users
   */
  v1ProjectsUsersCreate = (
    projectId: string,
    body: {
      email: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<
      (Role & {
        user?: User;
      })[],
      any
    >({
      path: `/api/v1/projects/${projectId}/users`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve users whose email matches given letters
   *
   * @tags user
   * @name V1ProjectsUsersMatchDetail
   * @summary Retrieve users whose email matches given letters
   * @request GET:/api/v1/projects/{projectId}/users/match
   */
  v1ProjectsUsersMatchDetail = (
    projectId: string,
    query: {
      letters: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<User[], any>({
      path: `/api/v1/projects/${projectId}/users/match`,
      method: "GET",
      query: query,
      format: "json",
      ...params,
    });
  /**
   * @description Update user role in a project team
   *
   * @tags user
   * @name V1ProjectsUsersUpdate
   * @summary Update user role in a project team
   * @request PUT:/api/v1/projects/{projectId}/users/{userId}
   */
  v1ProjectsUsersUpdate = (
    projectId: string,
    userId: string,
    body: {
      role?: "owner" | "user";
    },
    params: RequestParams = {},
  ) =>
    this.request<Role[], any>({
      path: `/api/v1/projects/${projectId}/users/${userId}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Remove user from a project team
   *
   * @tags user
   * @name V1ProjectsUsersDelete
   * @summary Remove user from a project team
   * @request DELETE:/api/v1/projects/{projectId}/users/{userId}
   */
  v1ProjectsUsersDelete = (projectId: string, userId: string, params: RequestParams = {}) =>
    this.request<Role[], any>({
      path: `/api/v1/projects/${projectId}/users/${userId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve permissions for a given environment
   *
   * @tags permission
   * @name V1ProjectsEnvironmentsPermissionsDetail
   * @summary Retrieve permissions for a given environment
   * @request GET:/api/v1/projects/{projectId}/environments/{environmentId}/permissions
   */
  v1ProjectsEnvironmentsPermissionsDetail = (projectId: string, environmentId: string, params: RequestParams = {}) =>
    this.request<Permission[], any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}/permissions`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a new permission
   *
   * @tags permission
   * @name V1ProjectsEnvironmentsPermissionsCreate
   * @summary Create a new permission
   * @request POST:/api/v1/projects/{projectId}/environments/{environmentId}/permissions
   */
  v1ProjectsEnvironmentsPermissionsCreate = (
    projectId: string,
    environmentId: string,
    body: {
      userId: string;
      level: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<Permission, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}/permissions`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update a permission
   *
   * @tags permission
   * @name V1ProjectsEnvironmentsPermissionsUpdate
   * @summary Update a permission
   * @request PUT:/api/v1/projects/{projectId}/environments/{environmentId}/permissions
   */
  v1ProjectsEnvironmentsPermissionsUpdate = (
    projectId: string,
    environmentId: string,
    body: {
      userId?: string;
      level?: number;
    },
    params: RequestParams = {},
  ) =>
    this.request<Permission, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}/permissions`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Archive a permission
   *
   * @tags permission
   * @name V1ProjectsEnvironmentsPermissionsDelete
   * @summary Archive a permission
   * @request DELETE:/api/v1/projects/{projectId}/environments/{environmentId}/permissions/{userId}
   */
  v1ProjectsEnvironmentsPermissionsDelete = (
    projectId: string,
    environmentId: string,
    userId: string,
    params: RequestParams = {},
  ) =>
    this.request<object, any>({
      path: `/api/v1/projects/${projectId}/environments/${environmentId}/permissions/${userId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve all users
   *
   * @tags user
   * @name V1AdminUsersList
   * @summary Retrieve all users, admin only
   * @request GET:/api/v1/admin/users/
   */
  v1AdminUsersList = (params: RequestParams = {}) =>
    this.request<User[], any>({
      path: `/api/v1/admin/users/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve all organizations
   *
   * @tags organization
   * @name V1AdminOrganizationsList
   * @summary Retrieve all organizations, admin only
   * @request GET:/api/v1/admin/organizations/
   */
  v1AdminOrganizationsList = (params: RequestParams = {}) =>
    this.request<Organization[], any>({
      path: `/api/v1/admin/organizations/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a new organization
   *
   * @tags organization
   * @name V1AdminOrganizationsCreate
   * @summary Create a new organization
   * @request POST:/api/v1/admin/organizations/
   */
  v1AdminOrganizationsCreate = (
    body: {
      source: string;
      name: string;
      label: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<Organization, any>({
      path: `/api/v1/admin/organizations/`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update an organization
   *
   * @tags organization
   * @name V1AdminOrganizationsSyncUpdate
   * @summary Update an organization
   * @request PUT:/api/v1/admin/organizations/sync
   */
  v1AdminOrganizationsSyncUpdate = (params: RequestParams = {}) =>
    this.request<Organization[], any>({
      path: `/api/v1/admin/organizations/sync`,
      method: "PUT",
      format: "json",
      ...params,
    });
  /**
   * @description Update an organization
   *
   * @tags organization
   * @name V1AdminOrganizationsUpdate
   * @summary Update an organization
   * @request PUT:/api/v1/admin/organizations/{orgName}
   */
  v1AdminOrganizationsUpdate = (
    orgName: string,
    body: {
      label?: string;
      source?: string;
      active?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<Organization, any>({
      path: `/api/v1/admin/organizations/${orgName}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve all projects
   *
   * @tags project
   * @name V1AdminProjectsList
   * @summary Retrieve all projects, admin only
   * @request GET:/api/v1/admin/projects/
   */
  v1AdminProjectsList = (params: RequestParams = {}) =>
    this.request<
      (UtilRequiredKeys<Project, "id" | "name" | "status" | "locked"> & {
        roles?: (Role & {
          user?: User;
        })[];
        environments?: (Environment & {
          permissions?: (Permission & {
            user?: User;
          })[];
        })[];
      })[],
      any
    >({
      path: `/api/v1/admin/projects/`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve all projects data for download as CSV file
   *
   * @tags project
   * @name V1AdminProjectsDataList
   * @summary Retrieve all projects data for download as CSV file, admin only
   * @request GET:/api/v1/admin/projects/data
   */
  v1AdminProjectsDataList = (params: RequestParams = {}) =>
    this.request<string, any>({
      path: `/api/v1/admin/projects/data`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Patch project (lock/unlock)
   *
   * @tags project
   * @name V1AdminProjectsPartialUpdate
   * @summary Patch a project
   * @request PATCH:/api/v1/admin/projects/{projectId}
   */
  v1AdminProjectsPartialUpdate = (
    projectId: string,
    body: {
      lock?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<object, any>({
      path: `/api/v1/admin/projects/${projectId}`,
      method: "PATCH",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve environments associated to a cluster
   *
   * @tags cluster, environment
   * @name V1AdminClustersEnvironmentsDetail
   * @summary Retrieve environments associated to a cluster, for admins only
   * @request GET:/api/v1/admin/clusters/{clusterId}/environments
   */
  v1AdminClustersEnvironmentsDetail = (clusterId: string, params: RequestParams = {}) =>
    this.request<
      {
        organization?: string;
        project?: string;
        name?: string;
        owner?: string;
      }[],
      any
    >({
      path: `/api/v1/admin/clusters/${clusterId}/environments`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a cluster
   *
   * @tags cluster
   * @name V1AdminClustersCreate
   * @summary Create a cluster, for admins only
   * @request POST:/api/v1/admin/clusters/
   */
  v1AdminClustersCreate = (
    body: {
      label: string;
      privacy: "public" | "dedicated";
      clusterResources: boolean;
      infos: string;
      cluster: {
        caData?: string;
        server?: string;
        tlsServerName?: string;
      };
      projectIds?: string[];
      stageIds?: string[];
      user: {
        certData?: string;
        keyData?: string;
      };
    },
    params: RequestParams = {},
  ) =>
    this.request<Cluster, any>({
      path: `/api/v1/admin/clusters/`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update a cluster
   *
   * @tags cluster
   * @name V1AdminClustersUpdate
   * @summary Update a cluster, for admins only
   * @request PUT:/api/v1/admin/clusters/{clusterId}
   */
  v1AdminClustersUpdate = (
    clusterId: string,
    body: {
      label?: string;
      privacy?: "public" | "dedicated";
      clusterResources?: boolean;
      infos?: string;
      cluster?: {
        caData?: string;
        server?: string;
        tlsServerName?: string;
      };
      projectIds?: string[];
      stageIds?: string[];
      user?: {
        certData?: string;
        keyData?: string;
      };
    },
    params: RequestParams = {},
  ) =>
    this.request<Cluster, any>({
      path: `/api/v1/admin/clusters/${clusterId}`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete a cluster
   *
   * @tags cluster
   * @name V1AdminClustersDelete
   * @summary Delete a cluster, for admins only
   * @request DELETE:/api/v1/admin/clusters/{clusterId}
   */
  v1AdminClustersDelete = (clusterId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/api/v1/admin/clusters/${clusterId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a quota's associated environments
   *
   * @tags quota, environment
   * @name V1AdminQuotasEnvironmentsDetail
   * @summary Retrieve a quota's associated environmentsn admin only
   * @request GET:/api/v1/admin/quotas/{quotaId}/environments
   */
  v1AdminQuotasEnvironmentsDetail = (quotaId: string, params: RequestParams = {}) =>
    this.request<
      {
        organization?: string;
        project?: string;
        name?: string;
        stage?: string;
        owner?: string;
      }[],
      any
    >({
      path: `/api/v1/admin/quotas/${quotaId}/environments`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a quota
   *
   * @tags quota
   * @name V1AdminQuotasCreate
   * @summary Create a quota, admin only
   * @request POST:/api/v1/admin/quotas/
   */
  v1AdminQuotasCreate = (
    body: {
      name: string;
      memory: string;
      cpu: number;
      isPrivate?: boolean;
      stageIds?: string[];
    },
    params: RequestParams = {},
  ) =>
    this.request<Quota, any>({
      path: `/api/v1/admin/quotas/`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update a quota's association with stages
   *
   * @tags quota, stage
   * @name V1AdminQuotasQuotastagesUpdate
   * @summary Update a quota's association with stages, admin only
   * @request PUT:/api/v1/admin/quotas/quotastages
   */
  v1AdminQuotasQuotastagesUpdate = (
    body: {
      quotaId?: string;
      stageIds?: string[];
      quotaIds?: string[];
      stageId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.request<QuotaStage[], any>({
      path: `/api/v1/admin/quotas/quotastages`,
      method: "PUT",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update a quota's privacy
   *
   * @tags quota
   * @name V1AdminQuotasPrivacyPartialUpdate
   * @summary Update a quota's privacy, admin only
   * @request PATCH:/api/v1/admin/quotas/{quotaId}/privacy
   */
  v1AdminQuotasPrivacyPartialUpdate = (
    quotaId: string,
    body: {
      isPrivate: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.request<Quota, any>({
      path: `/api/v1/admin/quotas/${quotaId}/privacy`,
      method: "PATCH",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete a quota
   *
   * @tags quota
   * @name V1AdminQuotasDelete
   * @summary Delete a quota, admin only
   * @request DELETE:/api/v1/admin/quotas/{quotaId}
   */
  v1AdminQuotasDelete = (quotaId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/api/v1/admin/quotas/${quotaId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve a stage's associated environments
   *
   * @tags stage, environment
   * @name V1AdminStagesEnvironmentsDetail
   * @summary Retrieve a stage's associated environments, admin only
   * @request GET:/api/v1/admin/stages/{stageId}/environments
   */
  v1AdminStagesEnvironmentsDetail = (stageId: string, params: RequestParams = {}) =>
    this.request<
      {
        organization?: string;
        project?: string;
        name?: string;
        quota?: string;
        cluster?: string;
        owner?: string;
      }[],
      any
    >({
      path: `/api/v1/admin/stages/${stageId}/environments`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * @description Create a stage
   *
   * @tags stage
   * @name V1AdminStagesCreate
   * @summary Create a stage, admin only
   * @request POST:/api/v1/admin/stages/
   */
  v1AdminStagesCreate = (
    body: {
      name: string;
      quotaIds?: string[];
      clusterIds?: string[];
      clusters?: Cluster[];
    },
    params: RequestParams = {},
  ) =>
    this.request<Stage, any>({
      path: `/api/v1/admin/stages/`,
      method: "POST",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Update a stage's associated clusters
   *
   * @tags stage
   * @name V1AdminStagesClustersPartialUpdate
   * @summary Update a stage's associated clusters, admin only
   * @request PATCH:/api/v1/admin/stages/{stageId}/clusters
   */
  v1AdminStagesClustersPartialUpdate = (
    stageId: string,
    body: {
      clusterIds: string[];
    },
    params: RequestParams = {},
  ) =>
    this.request<Cluster[], any>({
      path: `/api/v1/admin/stages/${stageId}/clusters`,
      method: "PATCH",
      body: body,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete a stage
   *
   * @tags stage
   * @name V1AdminStagesDelete
   * @summary Delete a stage, admin only
   * @request DELETE:/api/v1/admin/stages/{stageId}
   */
  v1AdminStagesDelete = (stageId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/api/v1/admin/stages/${stageId}`,
      method: "DELETE",
      format: "json",
      ...params,
    });
}
