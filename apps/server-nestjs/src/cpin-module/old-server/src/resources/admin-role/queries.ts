import prisma from '@old-server/prisma';
import type { AdminRole, Prisma } from '@prisma/client';

export const listAdminRoles = () =>
    prisma.adminRole.findMany({ orderBy: { position: 'asc' } });

export function createAdminRole(
    data: Pick<Prisma.AdminRoleUncheckedCreateInput, 'name' | 'position'>,
) {
    return prisma.adminRole.create({
        data: {
            name: data.name,
            permissions: 0n,
            position: data.position,
        },
    });
}

export function updateAdminRole(
    id: AdminRole['id'],
    data: Pick<
        Prisma.AdminRoleUncheckedUpdateInput,
        'permissions' | 'name' | 'position' | 'id'
    >,
) {
    return prisma.projectRole.updateMany({
        where: { id },
        data,
    });
}

export function deleteAdminRole(id: AdminRole['id']) {
    return prisma.projectRole.delete({
        where: {
            id,
        },
    });
}
