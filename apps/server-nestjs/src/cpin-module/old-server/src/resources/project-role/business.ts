import type { projectRoleContract } from '@cpn-console/shared';
import prisma from '@old-server/prisma.js';
import {
    deleteRole as deleteRoleQuery,
    listMembers,
    listRoles as listRolesQuery,
    updateRole,
} from '@old-server/resources/queries-index.js';
import { BadRequest400 } from '@old-server/utils/errors.js';
import type { Project, ProjectRole } from '@prisma/client';

export async function listRoles(projectId: Project['id']) {
    return listRolesQuery(projectId).then((roles) =>
        roles.map((role) => ({
            ...role,
            permissions: role.permissions.toString(),
        })),
    );
}

export async function patchRoles(
    projectId: Project['id'],
    roles: typeof projectRoleContract.patchProjectRoles.body._type,
) {
    const dbRoles = await listRoles(projectId);
    const positionsAvailable: number[] = [];

    const updatedRoles = dbRoles
        .filter((dbRole) => roles.find((role) => role.id === dbRole.id)) // filter non concerned dbRoles
        .map((dbRole) => {
            const matchingRole = roles.find((role) => role.id === dbRole.id);
            if (
                typeof matchingRole?.position !== 'undefined' &&
                !positionsAvailable.includes(matchingRole.position)
            ) {
                positionsAvailable.push(matchingRole.position);
            }
            return {
                id: matchingRole?.id ?? dbRole.id,
                name: matchingRole?.name ?? dbRole.name,
                permissions: matchingRole?.permissions
                    ? BigInt(matchingRole?.permissions)
                    : BigInt(dbRole.permissions),
                position: matchingRole?.position ?? dbRole.position,
            };
        });
    if (
        positionsAvailable.length &&
        positionsAvailable.length !== dbRoles.length
    )
        return new BadRequest400(
            'Les numéros de position des rôles sont incohérentes',
        );
    for (const { id, ...role } of updatedRoles) {
        await updateRole(id, role);
    }

    return listRoles(projectId);
}

export async function createRole(
    projectId: Project['id'],
    role: typeof projectRoleContract.createProjectRole.body._type,
) {
    const dbMaxPosRole =
        (
            await prisma.projectRole.findFirst({
                where: { projectId },
                orderBy: { position: 'desc' },
                select: { position: true },
            })
        )?.position ?? -1;

    await prisma.projectRole.create({
        data: {
            ...role,
            projectId,
            position: dbMaxPosRole + 1,
            permissions: BigInt(role.permissions),
        },
    });

    return listRoles(projectId);
}

export async function countRolesMembers(projectId: Project['id']) {
    const roles = await listRoles(projectId);
    const members = await listMembers(projectId);
    const rolesCounts: Record<ProjectRole['id'], number> = Object.fromEntries(
        roles.map((role) => [role.id, 0]),
    ); // {role uuid: 0}
    for (const { roleIds } of members) {
        for (const roleId of roleIds) {
            rolesCounts[roleId]++;
        }
    }
    return rolesCounts;
}

export async function deleteRole(roleId: Project['id']) {
    await deleteRoleQuery(roleId);
    return null;
}
