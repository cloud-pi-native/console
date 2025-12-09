import type {
    CreateRepositoryBody,
    UpdateRepositoryBody,
} from '@cpn-console/shared';
import {
    addLogs,
    deleteRepository as deleteRepositoryQuery,
    getProjectInfosAndRepos,
    getProjectRepositories as getProjectRepositoriesQuery,
    initializeRepository,
    updateRepository as updateRepositoryQuery,
} from '@old-server/resources/queries-index';
import { BadRequest400, Unprocessable422 } from '@old-server/utils/errors';
import { hook } from '@old-server/utils/hook-wrapper';
import type { Project, Repository, User } from '@prisma/client';

export async function getProjectRepositories(projectId: Project['id']) {
    return getProjectRepositoriesQuery(projectId);
}

export async function syncRepository({
    repositoryId,
    userId,
    syncAllBranches,
    branchName,
    requestId,
}: {
    repositoryId: Repository['id'];
    userId: User['id'];
    syncAllBranches: boolean;
    branchName?: string;
    requestId: string;
}) {
    const hookReply = await hook.misc.syncRepository(repositoryId, {
        syncAllBranches,
        branchName,
    });
    await addLogs({
        action: 'Sync Repository',
        data: hookReply,
        userId,
        requestId,
        projectId: hookReply.args.id,
    });
    if (hookReply.failed) {
        return new Unprocessable422(
            'Echec des services à la synchronisation du dépôt',
        );
    }
    return null;
}

export async function createRepository({
    data,
    userId,
    requestId,
}: {
    data: CreateRepositoryBody;
    userId: User['id'];
    requestId: string;
}) {
    const project = await getProjectInfosAndRepos(data.projectId);

    if (
        project.repositories?.find(
            (repo) => repo.internalRepoName === data.internalRepoName,
        )
    )
        return new BadRequest400(
            `Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`,
        );
    const dbData = {
        ...data,
        isInfra: !!data.isInfra,
        isPrivate: !!data.isPrivate,
    };
    delete dbData.externalToken;

    const repo = await initializeRepository(dbData);
    const { results } = await hook.project.upsert(
        project.id,
        data.isPrivate
            ? {
                  [repo.internalRepoName]: {
                      token: data.externalToken ?? '',
                      username: data.externalUserName ?? '',
                  },
              }
            : undefined,
    );
    await addLogs({
        action: 'Create Repository',
        data: results,
        userId,
        requestId,
        projectId: repo.projectId,
    });
    if (results.failed) {
        return new Unprocessable422(
            'Echec des services lors de la création du dépôt',
        );
    }

    if (data.externalRepoUrl) {
        await syncRepository({
            repositoryId: repo.id,
            requestId,
            syncAllBranches: true,
            userId,
        });
    }
    return repo;
}

export async function updateRepository({
    repositoryId,
    data,
    userId,
    requestId,
}: {
    repositoryId: Repository['id'];
    data: Partial<UpdateRepositoryBody>;
    userId: User['id'];
    requestId: string;
}) {
    const dbData = { ...data };
    delete dbData.externalToken;
    const repo = await updateRepositoryQuery(repositoryId, dbData);

    const { results } = await hook.project.upsert(repo.projectId, {
        [repo.internalRepoName]: {
            username: repo.externalUserName ?? '',
            token: data.externalToken ?? '',
        },
    });
    await addLogs({
        action: 'Update Repository',
        data: results,
        userId,
        requestId,
        projectId: repo.projectId,
    });
    if (results.failed) {
        return new Unprocessable422(
            'Echec des services à la mise à jour du dépôt',
        );
    }

    return repo;
}

export async function deleteRepository({
    repositoryId,
    userId,
    requestId,
    projectId,
}: {
    repositoryId: Repository['id'];
    userId: User['id'];
    requestId: string;
    projectId: Project['id'];
}) {
    await deleteRepositoryQuery(repositoryId);

    const { results } = await hook.project.upsert(projectId);
    await addLogs({
        action: 'Delete Repository',
        data: results,
        userId,
        requestId,
        projectId,
    });
    if (results.failed) {
        return new Unprocessable422(
            'Echec des services à la suppression du dépôt',
        );
    }
    return null;
}
