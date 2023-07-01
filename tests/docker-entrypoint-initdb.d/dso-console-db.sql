-- Adminer 4.8.1 PostgreSQL 14.5 (Debian 14.5-2.pgdg110+2) dump

\connect "dso-console-db";

DROP TABLE IF EXISTS "Environments";
CREATE TABLE "public"."Environments" (
    "id" uuid NOT NULL,
    "name" character varying(50) NOT NULL,
    "projectId" uuid NOT NULL,
    "status" character varying(50) DEFAULT 'initializing' NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Environments_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Environments";
INSERT INTO "Environments" ("id", "name", "projectId", "status", "createdAt", "updatedAt") VALUES
('d1f713bf-7712-4414-a21c-039c2c00e2ce',	'staging',	'011e7860-04d7-461f-912d-334c622d38b3',	'created',	'2023-06-30 07:52:04.419+00',	'2023-06-30 07:52:04.432+00'),
('188674d2-40f6-43ec-a64c-ef4670de292c',	'prod',	'011e7860-04d7-461f-912d-334c622d38b3',	'created',	'2023-06-30 07:52:04.419+00',	'2023-06-30 07:52:04.432+00'),
('bc39ed9b-b1ea-4973-a658-9341f84d0dc4',	'prod',	'83833faf-f654-40dd-bcd5-cf2e944fc702',	'created',	'2023-06-30 07:52:04.436+00',	'2023-06-30 07:52:04.443+00'),
('28837469-9cdb-4c3b-8714-c870e3914820',	'staging',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'created',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.449+00'),
('a12948bb-8bc8-46ea-a035-b06c86ce2734',	'dev',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'created',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.45+00'),
('6c56863c-d06f-4a89-9de5-ed8b91f4976a',	'staging',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'created',	'2023-06-30 07:52:04.459+00',	'2023-06-30 07:52:04.475+00'),
('24869d28-8780-4117-931a-684e4f1e1698',	'dev',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'created',	'2023-06-30 07:52:04.46+00',	'2023-06-30 07:52:04.475+00');

DROP TABLE IF EXISTS "Logs";
DROP SEQUENCE IF EXISTS "Logs_id_seq";

CREATE TABLE "public"."Logs" (
    "id" integer NOT NULL,
    "data" jsonb,
    "action" character varying(255) DEFAULT '' NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Logs";
INSERT INTO "Logs" ("id", "data", "action", "userId", "createdAt", "updatedAt") VALUES
(1,	'{"argo": {"status": {"result": "OK"}}, "args": {"owner": {"id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "email": "claire.nollet@interieur.gouv.fr", "lastName": "Nollet", "createdAt": "2023-06-08T14:57:58.401Z", "firstName": "Claire", "updatedAt": "2023-06-08T14:57:58.401Z"}, "project": "int-2", "environment": "staging", "organization": "ministere-interieur", "registryHost": "blabla.com", "repositories": []}, "vault": {"status": {"result": "OK"}, "pullSecret": {"data": {"HOST": "blabla.com", "TOKEN": "token", "USERNAME": "robot$ministere-interieur-int-2+ci", "DOCKER_CONFIG": "{\"auths\":{\"blabla.com\":{\"auth\":\"token\",\"email\":\"\"}}}"}, "metadata": {"version": 1, "destroyed": false, "created_time": "2023-06-08T15:14:56.087835715Z", "deletion_time": "", "custom_metadata": null}}}, "keycloak": {"group": {"id": "6ce9c548-d0f6-490b-b32d-6e62c20e5eff"}, "status": {"result": "OK"}, "roGroup": "/ministere-interieur-int-2/staging/RO", "rwGroup": "/ministere-interieur-int-2/staging/RW"}, "kubernetes": {"ns": {"kind": "Namespace", "spec": {"finalizers": ["kubernetes"]}, "status": {"phase": "Active"}, "metadata": {"uid": "facaa8a7-956c-4bbb-88d9-b6598ca90b43", "name": "ministere-interieur-int-2-staging", "labels": {"dso/projet": "int-2", "dso/owner.id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "dso/environment": "staging", "dso/organization": "ministere-interieur", "dso/owner.lastName": "Nollet", "dso/owner.firstName": "Claire", "kubernetes.io/metadata.name": "ministere-interieur-int-2-staging"}, "managedFields": [{"time": "2023-06-08T15:16:44.000Z", "manager": "unknown", "fieldsV1": {"f:metadata": {"f:labels": {".": {}, "f:dso/projet": {}, "f:dso/owner.id": {}, "f:dso/environment": {}, "f:dso/organization": {}, "f:dso/owner.lastName": {}, "f:dso/owner.firstName": {}, "f:kubernetes.io/metadata.name": {}}}}, "operation": "Update", "apiVersion": "v1", "fieldsType": "FieldsV1"}], "resourceVersion": "140498752", "creationTimestamp": "2023-06-08T15:16:44.000Z"}, "apiVersion": "v1"}, "status": {"result": "OK", "message": "Updated"}}}',	'create Project',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.42+00',	'2023-06-30 07:52:04.42+00'),
(2,	'{"argo": {"status": {"result": "OK", "message": "Not an infra repository"}}, "args": {"id": "bd934af0-6de2-41b2-a111-6b0c45b82384", "status": "initializing", "isInfra": false, "project": "int-2", "services": {"gitlab": {"id": 252}, "registry": {"id": 63}}, "createdAt": "2023-06-08T15:15:56.692Z", "isPrivate": false, "projectId": "1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6", "updatedAt": "2023-06-08T15:15:56.692Z", "environment": [], "internalUrl": "https://blabla.com/bla/projects/ministere-interieur/int-2/repo.git", "organization": "ministere-interieur", "externalToken": "", "externalRepoUrl": "https://github.com/dnum-mi/dso-console.git", "externalUserName": "", "internalRepoName": "repo"}, "vault": {"status": {"result": "OK"}, "recordsSaved": 1}, "gitlab": {"vault": [{"data": {"PROJECT_NAME": "int-2", "GIT_INPUT_URL": "github.com/dnum-mi/dso-console.git", "GIT_INPUT_USER": "", "GIT_OUTPUT_URL": "blabla.com/bla/projects/ministere-interieur/int-2/repo.git", "GIT_OUTPUT_USER": "root", "ORGANIZATION_NAME": "ministere-interieur", "GIT_INPUT_PASSWORD": "", "GIT_PIPELINE_TOKEN": "token", "GIT_OUTPUT_PASSWORD": "password"}, "name": "repo-mirror"}], "status": {"result": "OK", "message": "Created"}}}',	'Create Repository',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.42+00',	'2023-06-30 07:52:04.42+00'),
(3,	'{"args": {"id": "1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6", "owner": {"id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "email": "claire.nollet@interieur.gouv.fr", "lastName": "Nollet", "createdAt": "2023-06-08T14:57:58.401Z", "firstName": "Claire", "updatedAt": "2023-06-08T14:57:58.401Z"}, "locked": true, "status": "initializing", "project": "int-2", "services": null, "createdAt": "2023-06-08T15:14:53.517Z", "updatedAt": "2023-06-08T15:14:53.517Z", "description": null, "organization": "ministere-interieur"}, "nexus": {"user": {"roles": ["ministere-interieur-int-2-ID"], "source": "default", "status": "active", "userId": "ministere-interieur-int-2", "lastName": "Luffy", "readOnly": false, "firstName": "Monkey D.", "emailAddress": "claire.nollet@interieur.gouv.fr", "externalRoles": []}, "vault": [{"data": {"NEXUS_PASSWORD": "password", "NEXUS_USERNAME": "ministere-interieur-int-2"}, "name": "NEXUS"}], "status": {"result": "OK", "message": "User Created"}}, "vault": {"status": {"result": "OK"}, "recordsSaved": 4}, "gitlab": {"vault": [{"data": {"PROJECT_NAME": "int-2", "ORGANIZATION_NAME": "ministere-interieur"}, "name": "GITLAB"}], "result": {"user": {"id": 4, "bio": "", "bot": false, "name": "claire.nollet.interieur.gouv.fr", "note": null, "email": "claire.nollet@interieur.gouv.fr", "skype": "", "state": "active", "discord": "", "twitter": "", "web_url": "https://blabla.com/claire.nollet.interieur.gouv.fr", "external": false, "is_admin": false, "linkedin": "", "location": "", "pronouns": null, "theme_id": 1, "username": "claire.nollet.interieur.gouv.fr", "followers": 0, "following": 0, "job_title": "", "avatar_url": "https://secure.gravatar.com/avatar/8788671a0d7a433f128a49fe1953ac34?s=80&d=identicon", "created_at": "2023-05-11T17:19:29.797Z", "created_by": {"id": 1, "name": "Administrator", "state": "active", "web_url": "https://blabla.com/root", "username": "root", "avatar_url": "https://secure.gravatar.com/avatar/e64c7d89f26bd1972efa854d13d7dd61?s=80&d=identicon"}, "identities": [], "local_time": null, "is_followed": false, "website_url": "", "commit_email": "claire.nollet@interieur.gouv.fr", "confirmed_at": "2023-05-11T17:19:29.605Z", "namespace_id": 38, "organization": "", "public_email": null, "projects_limit": 100000, "color_scheme_id": 1, "last_sign_in_at": null, "private_profile": false, "can_create_group": false, "last_activity_on": null, "work_information": null, "can_create_project": true, "current_sign_in_at": null, "two_factor_enabled": false, "using_license_seat": false, "shared_runners_minutes_limit": null, "extra_shared_runners_minutes_limit": null}, "group": {"id": 252, "name": "int-2", "path": "int-2", "ldap_cn": null, "web_url": "https://blabla.com/groups/forge-mi/projects/ministere-interieur/int-2", "full_name": "forge-mi / projects / ministere-interieur / int-2", "full_path": "forge-mi/projects/ministere-interieur/int-2", "parent_id": 250, "avatar_url": null, "created_at": "2023-06-08T15:14:54.262Z", "visibility": "private", "description": "", "ldap_access": null, "lfs_enabled": true, "emails_disabled": null, "membership_lock": false, "mentions_disabled": null, "wiki_access_level": "enabled", "shared_with_groups": [], "auto_devops_enabled": null, "share_with_group_lock": false, "project_creation_level": "maintainer", "request_access_enabled": true, "subgroup_creation_level": "owner", "two_factor_grace_period": 48, "default_branch_protection": 0, "shared_runners_minutes_limit": null, "prevent_forking_outside_group": null, "require_two_factor_authentication": false, "extra_shared_runners_minutes_limit": null}, "groupMember": {"id": 4, "name": "claire.nollet.interieur.gouv.fr", "state": "active", "web_url": "https://blabla.com/claire.nollet.interieur.gouv.fr", "username": "claire.nollet.interieur.gouv.fr", "avatar_url": "https://secure.gravatar.com/avatar/8788671a0d7a433f128a49fe1953ac34?s=80&d=identicon", "created_at": "2023-06-08T15:14:54.918Z", "created_by": {"id": 1, "name": "Administrator", "state": "active", "web_url": "https://blabla.com/root", "username": "root", "avatar_url": "https://secure.gravatar.com/avatar/e64c7d89f26bd1972efa854d13d7dd61?s=80&d=identicon"}, "expires_at": null, "access_level": 40, "membership_state": "active"}}, "status": {"result": "OK", "message": "Created"}}, "keycloak": {"group": {"id": "4a767b5c-1bf4-43b9-8164-5da76ded49a0"}, "status": {"result": "OK"}}, "registry": {"vault": [{"data": {"HOST": "blabla.com", "TOKEN": "token", "USERNAME": "robot$ministere-interieur-int-2+ci", "DOCKER_CONFIG": "{\"auths\":{\"blabla.com\":{\"auth\":\"token\",\"email\":\"\"}}}"}, "name": "REGISTRY"}], "result": {"robot": {"id": 70, "name": "robot$ministere-interieur-int-2+ci", "secret": "token", "expires_at": -1, "creation_time": "2023-06-08T15:14:55.813Z"}, "project": {"name": "ministere-interieur-int-2", "metadata": {"public": "false"}, "owner_id": 1, "owner_name": "admin", "project_id": 63, "repo_count": 0, "update_time": "2023-06-08T15:14:55.363Z", "creation_time": "2023-06-08T15:14:55.363Z", "cve_allowlist": {"id": 65, "items": [], "project_id": 63, "update_time": "0001-01-01T00:00:00.000Z", "creation_time": "0001-01-01T00:00:00.000Z"}, "current_user_role_id": 1, "current_user_role_ids": [1]}}, "status": {"result": "OK", "message": "Created"}}, "sonarqube": {"user": {"user": {"name": "ministere-interieur-int-2", "email": "claire.nollet@interieur.gouv.fr", "local": true, "login": "ministere-interieur-int-2", "active": true, "scmAccounts": []}}, "vault": [{"data": {"SONAR_TOKEN": "token", "SONAR_PASSWORD": "password", "SONAR_USERNAME": "ministere-interieur-int-2"}, "name": "SONAR"}], "result": {}, "status": {"result": "OK", "message": "User Created"}}}',	'Create Environment',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.42+00',	'2023-06-30 07:52:04.42+00'),
(4,	'{"args": {"id": "1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6", "locked": false, "status": "created", "project": "int-2", "services": {"gitlab": {"id": 252}, "registry": {"id": 63}}, "createdAt": "2023-06-08T15:14:53.517Z", "updatedAt": "2023-06-08T15:16:49.011Z", "description": null, "organization": "ministere-interieur"}, "nexus": {"status": {"result": "OK", "message": "User deleted"}}, "vault": {"status": {"result": "OK"}, "secretsDestroyed": 5}, "gitlab": {"status": {"result": "OK", "message": "Deleted"}}, "keycloak": {"status": {"result": "OK", "message": "Deleted"}}, "registry": {"status": {"result": "OK", "message": "Deleted"}}, "sonarqube": {"status": {"result": "OK", "message": "User anonymized"}}}',	'Delete Project',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.42+00',	'2023-06-30 07:52:04.42+00'),
(5,	'{"argo": {"status": {"result": "OK"}}, "args": {"owner": {"id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "email": "claire.nollet@interieur.gouv.fr", "lastName": "Nollet", "createdAt": "2023-06-08T14:57:58.401Z", "firstName": "Claire", "updatedAt": "2023-06-08T14:57:58.401Z"}, "project": "int-2", "environment": "staging", "organization": "ministere-interieur", "registryHost": "blabla.com", "repositories": []}, "vault": {"status": {"result": "OK"}, "pullSecret": {"data": {"HOST": "blabla.com", "TOKEN": "token", "USERNAME": "robot$ministere-interieur-int-2+ci", "DOCKER_CONFIG": "{\"auths\":{\"blabla.com\":{\"auth\":\"token\",\"email\":\"\"}}}"}, "metadata": {"version": 1, "destroyed": false, "created_time": "2023-06-08T15:14:56.087835715Z", "deletion_time": "", "custom_metadata": null}}}, "keycloak": {"group": {"id": "6ce9c548-d0f6-490b-b32d-6e62c20e5eff"}, "status": {"result": "OK"}, "roGroup": "/ministere-interieur-int-2/staging/RO", "rwGroup": "/ministere-interieur-int-2/staging/RW"}, "kubernetes": {"ns": {"kind": "Namespace", "spec": {"finalizers": ["kubernetes"]}, "status": {"phase": "Active"}, "metadata": {"uid": "facaa8a7-956c-4bbb-88d9-b6598ca90b43", "name": "ministere-interieur-int-2-staging", "labels": {"dso/projet": "int-2", "dso/owner.id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "dso/environment": "staging", "dso/organization": "ministere-interieur", "dso/owner.lastName": "Nollet", "dso/owner.firstName": "Claire", "kubernetes.io/metadata.name": "ministere-interieur-int-2-staging"}, "managedFields": [{"time": "2023-06-08T15:16:44.000Z", "manager": "unknown", "fieldsV1": {"f:metadata": {"f:labels": {".": {}, "f:dso/projet": {}, "f:dso/owner.id": {}, "f:dso/environment": {}, "f:dso/organization": {}, "f:dso/owner.lastName": {}, "f:dso/owner.firstName": {}, "f:kubernetes.io/metadata.name": {}}}}, "operation": "Update", "apiVersion": "v1", "fieldsType": "FieldsV1"}], "resourceVersion": "140498752", "creationTimestamp": "2023-06-08T15:16:44.000Z"}, "apiVersion": "v1"}, "status": {"result": "OK", "message": "Updated"}}}',	'create Project',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.437+00',	'2023-06-30 07:52:04.437+00'),
(6,	'{"argo": {"status": {"result": "OK"}}, "args": {"owner": {"id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "email": "claire.nollet@interieur.gouv.fr", "lastName": "Nollet", "createdAt": "2023-06-08T14:57:58.401Z", "firstName": "Claire", "updatedAt": "2023-06-08T14:57:58.401Z"}, "project": "int-2", "environment": "staging", "organization": "ministere-interieur", "registryHost": "blabla.com", "repositories": []}, "vault": {"status": {"result": "OK"}, "pullSecret": {"data": {"HOST": "blabla.com", "TOKEN": "token", "USERNAME": "robot$ministere-interieur-int-2+ci", "DOCKER_CONFIG": "{\"auths\":{\"blabla.com\":{\"auth\":\"token\",\"email\":\"\"}}}"}, "metadata": {"version": 1, "destroyed": false, "created_time": "2023-06-08T15:14:56.087835715Z", "deletion_time": "", "custom_metadata": null}}}, "keycloak": {"group": {"id": "6ce9c548-d0f6-490b-b32d-6e62c20e5eff"}, "status": {"result": "OK"}, "roGroup": "/ministere-interieur-int-2/staging/RO", "rwGroup": "/ministere-interieur-int-2/staging/RW"}, "kubernetes": {"ns": {"kind": "Namespace", "spec": {"finalizers": ["kubernetes"]}, "status": {"phase": "Active"}, "metadata": {"uid": "facaa8a7-956c-4bbb-88d9-b6598ca90b43", "name": "ministere-interieur-int-2-staging", "labels": {"dso/projet": "int-2", "dso/owner.id": "cb8e5b4b-7b7b-40f5-935f-594f48ae6565", "dso/environment": "staging", "dso/organization": "ministere-interieur", "dso/owner.lastName": "Nollet", "dso/owner.firstName": "Claire", "kubernetes.io/metadata.name": "ministere-interieur-int-2-staging"}, "managedFields": [{"time": "2023-06-08T15:16:44.000Z", "manager": "unknown", "fieldsV1": {"f:metadata": {"f:labels": {".": {}, "f:dso/projet": {}, "f:dso/owner.id": {}, "f:dso/environment": {}, "f:dso/organization": {}, "f:dso/owner.lastName": {}, "f:dso/owner.firstName": {}, "f:kubernetes.io/metadata.name": {}}}}, "operation": "Update", "apiVersion": "v1", "fieldsType": "FieldsV1"}], "resourceVersion": "140498752", "creationTimestamp": "2023-06-08T15:16:44.000Z"}, "apiVersion": "v1"}, "status": {"result": "OK", "message": "Updated"}}}',	'create Project',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.444+00'),
(7,	'{"argo": {"status": {"result": "OK", "message": "Not an infra repository"}}, "args": {"id": "bd934af0-6de2-41b2-a111-6b0c45b82384", "status": "initializing", "isInfra": false, "project": "int-2", "services": {"gitlab": {"id": 252}, "registry": {"id": 63}}, "createdAt": "2023-06-08T15:15:56.692Z", "isPrivate": false, "projectId": "1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6", "updatedAt": "2023-06-08T15:15:56.692Z", "environment": [], "internalUrl": "https://blabla.com/bla/projects/ministere-interieur/int-2/repo.git", "organization": "ministere-interieur", "externalToken": "", "externalRepoUrl": "https://github.com/dnum-mi/dso-console.git", "externalUserName": "", "internalRepoName": "repo"}, "vault": {"status": {"result": "OK"}, "recordsSaved": 1}, "gitlab": {"vault": [{"data": {"PROJECT_NAME": "int-2", "GIT_INPUT_URL": "github.com/dnum-mi/dso-console.git", "GIT_INPUT_USER": "", "GIT_OUTPUT_URL": "blabla.com/bla/projects/ministere-interieur/int-2/repo.git", "GIT_OUTPUT_USER": "root", "ORGANIZATION_NAME": "ministere-interieur", "GIT_INPUT_PASSWORD": "", "GIT_PIPELINE_TOKEN": "token", "GIT_OUTPUT_PASSWORD": "password"}, "name": "repo-mirror"}], "status": {"result": "OK", "message": "Created"}}}',	'Create Repository',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.444+00');

DROP TABLE IF EXISTS "Organizations";
CREATE TABLE "public"."Organizations" (
    "id" uuid NOT NULL,
    "source" character varying(50),
    "name" character varying(50) NOT NULL,
    "label" character varying(90) NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Organizations_name_key" UNIQUE ("name"),
    CONSTRAINT "Organizations_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Organizations";
INSERT INTO "Organizations" ("id", "source", "name", "label", "active", "createdAt", "updatedAt") VALUES
('2368a61e-f243-42f6-b471-a85b056ee131',	'dso-console',	'dinum',	'DINUM',	't',	'2023-06-30 07:52:04.391+00',	'2023-06-30 07:52:04.391+00'),
('b644c07f-193c-47ed-ae10-b88a8f63d20b',	'dso-console',	'ministere-interieur',	'Ministère de l''Intérieur',	't',	'2023-06-30 07:52:04.396+00',	'2023-06-30 07:52:04.396+00'),
('94e5b24b-ba73-4169-af09-e2df4b83a60f',	'dso-console',	'ministere-justice',	'Ministère de la Justice',	't',	'2023-06-30 07:52:04.398+00',	'2023-06-30 07:52:04.398+00');

DROP TABLE IF EXISTS "Permissions";
CREATE TABLE "public"."Permissions" (
    "id" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "environmentId" uuid NOT NULL,
    "level" integer DEFAULT '0' NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Permissions";
INSERT INTO "Permissions" ("id", "userId", "environmentId", "level", "createdAt", "updatedAt") VALUES
('f736c250-7892-4046-82eb-ce2c4f4f7f02',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'd1f713bf-7712-4414-a21c-039c2c00e2ce',	2,	'2023-06-30 07:52:04.434+00',	'2023-06-30 07:52:04.434+00'),
('b853923f-d96a-4c5a-8844-4c4ff98f2fb9',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'188674d2-40f6-43ec-a64c-ef4670de292c',	2,	'2023-06-30 07:52:04.435+00',	'2023-06-30 07:52:04.435+00'),
('7aec4312-fe8c-435c-b435-8c0ee5d0d763',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'188674d2-40f6-43ec-a64c-ef4670de292c',	0,	'2023-06-30 07:52:04.435+00',	'2023-06-30 07:52:04.435+00'),
('12f53a65-791e-4091-b163-0e63f7eb8521',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',	'188674d2-40f6-43ec-a64c-ef4670de292c',	0,	'2023-06-30 07:52:04.435+00',	'2023-06-30 07:52:04.435+00'),
('c8e9dca7-ca04-453b-a653-82890248d690',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'bc39ed9b-b1ea-4973-a658-9341f84d0dc4',	2,	'2023-06-30 07:52:04.446+00',	'2023-06-30 07:52:04.446+00'),
('8ca584df-6dce-4ab6-a28e-624422d7fa72',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'28837469-9cdb-4c3b-8714-c870e3914820',	2,	'2023-06-30 07:52:04.455+00',	'2023-06-30 07:52:04.455+00'),
('a425157e-3aa0-4095-9203-21d6dd5f6025',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'28837469-9cdb-4c3b-8714-c870e3914820',	0,	'2023-06-30 07:52:04.455+00',	'2023-06-30 07:52:04.455+00'),
('15d0061e-1559-44fc-91ff-d287e92f2a66',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'a12948bb-8bc8-46ea-a035-b06c86ce2734',	2,	'2023-06-30 07:52:04.455+00',	'2023-06-30 07:52:04.455+00'),
('26005ab9-086d-4ec5-a491-60366295cad2',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'a12948bb-8bc8-46ea-a035-b06c86ce2734',	1,	'2023-06-30 07:52:04.456+00',	'2023-06-30 07:52:04.456+00'),
('beb2de48-fa26-43f5-adb1-e3a4a5deb430',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'a12948bb-8bc8-46ea-a035-b06c86ce2734',	1,	'2023-06-30 07:52:04.456+00',	'2023-06-30 07:52:04.456+00'),
('2bbaf41b-69eb-43d2-a54e-04871716646f',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',	'a12948bb-8bc8-46ea-a035-b06c86ce2734',	0,	'2023-06-30 07:52:04.456+00',	'2023-06-30 07:52:04.456+00'),
('25e18e73-1f01-4c68-af99-1b3c185ec420',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'6c56863c-d06f-4a89-9de5-ed8b91f4976a',	2,	'2023-06-30 07:52:04.477+00',	'2023-06-30 07:52:04.477+00'),
('47494481-f019-47c7-b15f-b4bb6336bcdf',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'6c56863c-d06f-4a89-9de5-ed8b91f4976a',	0,	'2023-06-30 07:52:04.477+00',	'2023-06-30 07:52:04.477+00'),
('cbe25672-2ff7-4cd6-9eaa-3251d2cf227c',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'24869d28-8780-4117-931a-684e4f1e1698',	2,	'2023-06-30 07:52:04.478+00',	'2023-06-30 07:52:04.478+00'),
('8907a2d0-ad91-4e51-b5f4-55b3791948e6',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'24869d28-8780-4117-931a-684e4f1e1698',	1,	'2023-06-30 07:52:04.478+00',	'2023-06-30 07:52:04.478+00'),
('6c2e0d6a-a148-4aac-8ec1-8a523d389966',	'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'24869d28-8780-4117-931a-684e4f1e1698',	1,	'2023-06-30 07:52:04.478+00',	'2023-06-30 07:52:04.478+00');

DROP TABLE IF EXISTS "Projects";
CREATE TABLE "public"."Projects" (
    "id" uuid NOT NULL,
    "name" character varying(50) NOT NULL,
    "organization" uuid NOT NULL,
    "description" character varying(280),
    "status" character varying(50) NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "services" jsonb,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Projects_organization_name_key" UNIQUE ("organization", "name"),
    CONSTRAINT "Projects_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Projects";
INSERT INTO "Projects" ("id", "name", "organization", "description", "status", "locked", "services", "createdAt", "updatedAt") VALUES
('011e7860-04d7-461f-912d-334c622d38b3',	'candilib',	'b644c07f-193c-47ed-ae10-b88a8f63d20b',	'Application de réservation de places à l''examen du permis B.',	'created',	'f',	'{"gitlab": {"id": 34}, "registry": {"id": 25}}',	'2023-06-30 07:52:04.41+00',	'2023-06-30 07:52:04.414+00'),
('83833faf-f654-40dd-bcd5-cf2e944fc702',	'psij-failed',	'b644c07f-193c-47ed-ae10-b88a8f63d20b',	'Application de transmission d''informations entre agents de la PS et de l''IJ.',	'failed',	't',	'{"gitlab": {"id": 34}, "registry": {"id": 25}}',	'2023-06-30 07:52:04.428+00',	'2023-06-30 07:52:04.433+00'),
('22e7044f-8414-435d-9c4a-2df42a65034b',	'beta-app',	'2368a61e-f243-42f6-b471-a85b056ee131',	NULL,	'created',	'f',	'{"gitlab": {"id": 34}, "registry": {"id": 25}}',	'2023-06-30 07:52:04.44+00',	'2023-06-30 07:52:04.442+00'),
('9dabf3f9-6c86-4358-8598-65007d78df65',	'project-to-archive',	'2368a61e-f243-42f6-b471-a85b056ee131',	NULL,	'created',	'f',	'{"gitlab": {"id": 34}, "registry": {"id": 25}}',	'2023-06-30 07:52:04.448+00',	'2023-06-30 07:52:04.457+00');

DROP TABLE IF EXISTS "Repositories";
CREATE TABLE "public"."Repositories" (
    "id" uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "internalRepoName" character varying(50) NOT NULL,
    "externalRepoUrl" character varying(500) NOT NULL,
    "externalUserName" character varying(255),
    "externalToken" character varying(255),
    "isInfra" boolean DEFAULT false NOT NULL,
    "isPrivate" boolean DEFAULT false NOT NULL,
    "status" character varying(50) DEFAULT 'initializing' NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Repositories_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Repositories";
INSERT INTO "Repositories" ("id", "projectId", "internalRepoName", "externalRepoUrl", "externalUserName", "externalToken", "isInfra", "isPrivate", "status", "createdAt", "updatedAt") VALUES
('b96dba8c-1d32-4b6c-b99c-0fb273e1b5d9',	'011e7860-04d7-461f-912d-334c622d38b3',	'candilib',	'https://github.com/dnum-mi/candilib.git',	'this-is-a-test',	'',	'f',	't',	'created',	'2023-06-30 07:52:04.42+00',	'2023-06-30 07:52:04.429+00'),
('ded67cbb-e7d9-4fd7-9002-6bf8f1c7e408',	'83833faf-f654-40dd-bcd5-cf2e944fc702',	'psij-front',	'https://github.com/dnum-mi/psij-front.git',	'this-is-a-test',	'',	'f',	't',	'created',	'2023-06-30 07:52:04.436+00',	'2023-06-30 07:52:04.441+00'),
('8a2fa06e-b7b2-42f7-9487-fb2af97fa5f5',	'83833faf-f654-40dd-bcd5-cf2e944fc702',	'psij-back',	'https://github.com/dnum-mi/psij-back.git',	'this-is-a-test',	'',	'f',	't',	'failed',	'2023-06-30 07:52:04.436+00',	'2023-06-30 07:52:04.442+00'),
('eae26caa-37a2-4150-81e0-e1c90995ddbe',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'beta-front',	'https://github.com/dnum-mi/beta-front.git',	'this-is-a-test',	'',	'f',	't',	'created',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.448+00'),
('0b6cc5ec-4e6c-43e2-a46e-2fcb802ad3a7',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'beta-back',	'https://github.com/dnum-mi/beta-back.git',	NULL,	'',	'f',	'f',	'created',	'2023-06-30 07:52:04.444+00',	'2023-06-30 07:52:04.449+00'),
('d6274e48-efbd-4752-aa55-1d118f32f09f',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'archive-back',	'https://github.com/dnum-mi/archive-back.git',	NULL,	'',	'f',	'f',	'created',	'2023-06-30 07:52:04.46+00',	'2023-06-30 07:52:04.474+00'),
('c5ce6d7d-ab74-4f27-bedb-e4b6c9091b9d',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'archive-front',	'https://github.com/dnum-mi/archive-front.git',	'this-is-a-test',	'',	'f',	't',	'created',	'2023-06-30 07:52:04.46+00',	'2023-06-30 07:52:04.474+00');

DROP TABLE IF EXISTS "Users";
CREATE TABLE "public"."Users" (
    "id" uuid NOT NULL,
    "firstName" character varying(50) NOT NULL,
    "lastName" character varying(50) NOT NULL,
    "email" character varying(255) NOT NULL,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Users_email_key" UNIQUE ("email"),
    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
) WITH (oids = false);

TRUNCATE "Users";
INSERT INTO "Users" ("id", "firstName", "lastName", "email", "createdAt", "updatedAt") VALUES
('cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'test',	'com',	'test@test.com',	'2023-06-30 07:52:04.403+00',	'2023-06-30 07:52:04.403+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'Claire',	'NOLLET',	'claire.nollet@test.com',	'2023-06-30 07:52:04.405+00',	'2023-06-30 07:52:04.405+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'Thibault',	'COLIN',	'thibault.colin@test.com',	'2023-06-30 07:52:04.405+00',	'2023-06-30 07:52:04.405+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6568',	'Baudoin',	'TRAN',	'baudoin.tran@test.com',	'2023-06-30 07:52:04.406+00',	'2023-06-30 07:52:04.406+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6569',	'Arnaud',	'TARDIF',	'arnaud.tardif@test.com',	'2023-06-30 07:52:04.406+00',	'2023-06-30 07:52:04.406+00');

DROP TABLE IF EXISTS "Roles";
CREATE TABLE "public"."Roles" (
    "UserId" uuid NOT NULL,
    "ProjectId" uuid NOT NULL,
    "role" character varying(255),
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    CONSTRAINT "Roles_pkey" PRIMARY KEY ("UserId", "ProjectId")
) WITH (oids = false);

TRUNCATE "Roles";
INSERT INTO "Roles" ("UserId", "ProjectId", "role", "createdAt", "updatedAt") VALUES
('cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'011e7860-04d7-461f-912d-334c622d38b3',	'owner',	'2023-06-30 07:52:04.43+00',	'2023-06-30 07:52:04.43+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6569',	'011e7860-04d7-461f-912d-334c622d38b3',	'user',	'2023-06-30 07:52:04.431+00',	'2023-06-30 07:52:04.431+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'011e7860-04d7-461f-912d-334c622d38b3',	'user',	'2023-06-30 07:52:04.433+00',	'2023-06-30 07:52:04.433+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'83833faf-f654-40dd-bcd5-cf2e944fc702',	'owner',	'2023-06-30 07:52:04.44+00',	'2023-06-30 07:52:04.44+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'owner',	'2023-06-30 07:52:04.45+00',	'2023-06-30 07:52:04.45+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6569',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'user',	'2023-06-30 07:52:04.451+00',	'2023-06-30 07:52:04.451+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'user',	'2023-06-30 07:52:04.451+00',	'2023-06-30 07:52:04.451+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'22e7044f-8414-435d-9c4a-2df42a65034b',	'user',	'2023-06-30 07:52:04.452+00',	'2023-06-30 07:52:04.452+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6565',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'owner',	'2023-06-30 07:52:04.476+00',	'2023-06-30 07:52:04.476+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6567',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'user',	'2023-06-30 07:52:04.476+00',	'2023-06-30 07:52:04.476+00'),
('cb8e5b4b-7b7b-40f5-935f-594f48ae6566',	'9dabf3f9-6c86-4358-8598-65007d78df65',	'user',	'2023-06-30 07:52:04.477+00',	'2023-06-30 07:52:04.477+00');

ALTER TABLE ONLY "public"."Environments" ADD CONSTRAINT "Environments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."Logs" ADD CONSTRAINT "Logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"(id) ON UPDATE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."Permissions" ADD CONSTRAINT "Permissions_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environments"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."Permissions" ADD CONSTRAINT "Permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."Projects" ADD CONSTRAINT "Projects_organization_fkey" FOREIGN KEY (organization) REFERENCES "Organizations"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."Repositories" ADD CONSTRAINT "Repositories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

ALTER TABLE ONLY "public"."Roles" ADD CONSTRAINT "Roles_ProjectId_fkey" FOREIGN KEY ("ProjectId") REFERENCES "Projects"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;
ALTER TABLE ONLY "public"."Roles" ADD CONSTRAINT "Roles_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE CASCADE NOT DEFERRABLE;

-- 2023-06-30 07:52:30.258466+00
