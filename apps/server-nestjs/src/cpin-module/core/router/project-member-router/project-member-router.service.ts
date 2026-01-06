import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import {
    AdminAuthorized,
    ProjectAuthorized,
    projectMemberContract,
} from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    addMember,
    listMembers,
    patchMembers,
    removeMember,
} from '@old-server/resources/project-member/business';
import { authUser } from '@old-server/utils/controller';
import {
    ErrorResType,
    Forbidden403,
    NotFound404,
    Unauthorized401,
} from '@old-server/utils/errors';

@Injectable()
export class ProjectMemberRouterService {
    constructor(private readonly serverService: ServerService) {}

    projectMemberRouter() {
        return this.serverService.serverInstance.router(projectMemberContract, {
            listMembers: async ({ request: req, params }) => {
                const { projectId } = params;
                const perms = await authUser(req, { id: projectId });
                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }

                const body = await listMembers(projectId);

                return {
                    status: 200,
                    body,
                };
            },

            addMember: async ({ request: req, params, body }) => {
                const { projectId } = params;
                const perms = await authUser(req, { id: projectId });

                if (!perms.user) {
                    return new Unauthorized401(
                        'Require to be requested from user not api key',
                    );
                }
                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }
                if (!ProjectAuthorized.ManageMembers(perms))
                    return new Forbidden403();
                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                const resBody = await addMember(
                    projectId,
                    body,
                    perms.user.id,
                    req.id,
                    perms.projectOwnerId,
                );
                if (resBody instanceof ErrorResType) return resBody;

                return {
                    status: 201,
                    body: resBody,
                };
            },

            patchMembers: async ({ request: req, params, body }) => {
                const { projectId } = params;
                const perms = await authUser(req, { id: projectId });

                if (!perms.projectPermissions) return new NotFound404();
                if (!ProjectAuthorized.ManageMembers(perms))
                    return new Forbidden403();
                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                const resBody = await patchMembers(projectId, body);

                return {
                    status: 200,
                    body: resBody,
                };
            },

            removeMember: async ({ request: req, params }) => {
                const { projectId, userId } = params;
                const perms = await authUser(req, { id: projectId });

                if (perms.projectLocked)
                    return new Forbidden403('Le projet est verrouillé');
                if (perms.projectStatus === 'archived')
                    return new Forbidden403('Le projet est archivé');

                if (
                    !perms.projectPermissions &&
                    !AdminAuthorized.isAdmin(perms.adminPermissions)
                ) {
                    return new NotFound404();
                }

                if (
                    !ProjectAuthorized.ManageMembers(perms) &&
                    userId !== perms.user?.id
                ) {
                    return new Forbidden403();
                }

                const resBody = await removeMember(projectId, params.userId);

                return {
                    status: 200,
                    body: resBody,
                };
            },
        });
    }
}
