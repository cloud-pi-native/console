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

export interface Organization {
  id?: string;
  source?: string;
  name?: string;
  label?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
  logs?: object[];
  permissions?: Permission[];
  roles?: Role[];
}

export type Service = Record<
  string,
  {
    name?: string;
    to?: string;
    monitorUrl?: string;
    title?: string;
    imgSrc?: string;
    description?: string;
  }
>;

export interface Permission {
  id?: string;
  userId?: string;
  level?: number;
  environmentId?: string;
  createdAt?: string;
  updatedAt?: string;
  environment?: Environment;
  user?: User;
}

export interface Environment {
  id?: string;
  name?: string;
  clusterId?: string;
  quotaStageId?: string;
  projectId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  permissions?: Permission[];
  cluster?: Cluster;
  project?: Project;
  quotaStage?: QuotaStage;
}

/** repository */
export interface Repository {
  id?: string;
  internalRepoName?: string;
  externalRepoUrl?: string;
  externalUserName?: string;
  externalToken?: string;
  isInfra?: boolean;
  isPrivate?: boolean;
  projectId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: Project;
}

export interface Role {
  userId?: string;
  projectId?: string;
  role?: "owner" | "user";
  createdAt?: string;
  updatedAt?: string;
  project?: Project;
  user?: User;
}

export interface Cluster {
  id?: string;
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
  kubeConfigId?: string;
  secretName?: string;
  createdAt?: string;
  updatedAt?: string;
  kubeconfig?: object;
  projects?: Project[];
  environments?: Environment[];
  stages?: {
    id?: string;
    name?: string;
    clusters?: Cluster[];
    quotaStage?: {
      id?: string;
      status?: string;
      quotaId?: string;
      stageId?: string;
      environments?: Environment[];
      quota?: {
        id?: string;
        name?: string;
        memory?: string;
        cpu?: number;
        isPrivate?: boolean;
        stageIds?: string[];
        quotaStage?: QuotaStage[];
      };
      stage?: {
        id?: string;
        name?: string;
        clusters?: Cluster[];
        quotaStage?: QuotaStage[];
      };
    }[];
  }[];
}

export interface Project {
  id?: string;
  name?: string;
  organizationId?: string;
  description?: string;
  status?: "initializing" | "created" | "failed" | "archived";
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  organization?: Organization;
  services?: Service;
  environments?: Environment[];
  repositories?: Repository[];
  roles?: Role[];
  clusters?: Cluster[];
}

export interface QuotaStage {
  id?: string;
  status?: string;
  quotaId?: string;
  stageId?: string;
  environments?: Environment[];
  quota?: {
    id?: string;
    name?: string;
    memory?: string;
    cpu?: number;
    isPrivate?: boolean;
    stageIds?: string[];
    quotaStage?: QuotaStage[];
  };
  stage?: {
    id?: string;
    name?: string;
    clusters?: Cluster[];
    quotaStage?: QuotaStage[];
  };
}

export interface Quota {
  id?: string;
  name?: string;
  memory?: string;
  cpu?: number;
  isPrivate?: boolean;
  stageIds?: string[];
  quotaStage?: {
    id?: string;
    status?: string;
    quotaId?: string;
    stageId?: string;
    environments?: Environment[];
    quota?: {
      id?: string;
      name?: string;
      memory?: string;
      cpu?: number;
      isPrivate?: boolean;
      stageIds?: string[];
      quotaStage?: QuotaStage[];
    };
    stage?: {
      id?: string;
      name?: string;
      clusters?: Cluster[];
      quotaStage?: QuotaStage[];
    };
  }[];
}

export interface Stage {
  id?: string;
  name?: string;
  clusters?: Cluster[];
  quotaStage?: {
    id?: string;
    status?: string;
    quotaId?: string;
    stageId?: string;
    environments?: Environment[];
    quota?: {
      id?: string;
      name?: string;
      memory?: string;
      cpu?: number;
      isPrivate?: boolean;
      stageIds?: string[];
      quotaStage?: QuotaStage[];
    };
    stage?: {
      id?: string;
      name?: string;
      clusters?: Cluster[];
      quotaStage?: QuotaStage[];
    };
  }[];
}
