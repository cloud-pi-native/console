import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import {
    AdminAuthorized,
    ProjectAuthorized,
    projectRoleContract,
} from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    countRolesMembers,
    createRole,
    deleteRole,
    listRoles,
    patchRoles,
} from '@old-server/resources/project-role/business';
import { authUser } from '@old-server/utils/controller';
import {
    ErrorResType,
    Forbidden403,
    NotFound404,
} from '@old-server/utils/errors';

@Injectable()
export class ProjectRoleRouterService {
    constructor(private readonly serverService: ServerService) {}

    projectRoleRouter() {
        return this.serverService.serverInstance.router(projectRoleContract, {
            // Récupérer des projets
            listProjectRoles: async ({ request: req, params }) => {
                const { projectId } = params;
                const perms = await authUser(req, { id: projectId });
                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }

                const body = await listRoles(projectId);

                return {
                    status: 200,
                    body,
                };
            },

            createProjectRole: async ({
                request: req,
                params: { projectId },
                body,
            }) => {
                const perms = await authUser(req, { id: projectId });

                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }
                if (!ProjectAuthorized.ManageRoles(perms))
                    return new Forbidden403();
                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                const resBody = await createRole(projectId, body);

                return {
                    status: 201,
                    body: resBody,
                };
            },

            patchProjectRoles: async ({
                request: req,
                params: { projectId },
                body,
            }) => {
                const perms = await authUser(req, { id: projectId });

                if (!perms.projectPermissions) return new NotFound404();
                if (!ProjectAuthorized.ManageRoles(perms))
                    return new Forbidden403();
                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                const resBody = await patchRoles(projectId, body);
                if (resBody instanceof ErrorResType) return resBody;

                return {
                    status: 200,
                    body: resBody,
                };
            },

            projectRoleMemberCounts: async ({ request: req, params }) => {
                const { projectId } = params;
                const perms = await authUser(req, { id: projectId });
                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }

                const resBody = await countRolesMembers(projectId);

                return {
                    status: 200,
                    body: resBody,
                };
            },

            deleteProjectRole: async ({
                request: req,
                params: { projectId, roleId },
            }) => {
                const perms = await authUser(req, { id: projectId });
                if (!perms.projectPermissions) return new NotFound404();
                if (!ProjectAuthorized.ManageRoles(perms))
                    return new Forbidden403();
                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                const resBody = await deleteRole(roleId);

                return {
                    status: 204,
                    body: resBody,
                };
            },
        });
    }
}
