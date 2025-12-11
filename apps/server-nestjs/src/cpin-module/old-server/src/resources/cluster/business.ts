import type {
    Cluster,
    ClusterDetails,
    Kubeconfig,
    clusterContract,
} from '@cpn-console/shared';
import { ClusterDetailsSchema, ClusterPrivacy } from '@cpn-console/shared';
import prisma from '@old-server/prisma';
import {
    addLogs,
    createCluster as createClusterQuery,
    deleteCluster as deleteClusterQuery,
    getClusterById,
    getClusterByLabel,
    getClusterDetails as getClusterDetailsQuery,
    getClusterEnvironments,
    getProjectsByClusterId,
    linkClusterToProjects,
    linkZoneToClusters,
    listClusters as listClustersQuery,
    listStagesByClusterId,
    removeClusterFromProject,
    removeClusterFromStage,
    updateCluster as updateClusterQuery,
} from '@old-server/resources/queries-index';
import { linkClusterToStages } from '@old-server/resources/stage/business';
import type { Resources } from '@old-server/types/index';
import { validateSchema } from '@old-server/utils/business';
import {
    BadRequest400,
    ErrorResType,
    NotFound404,
    Unprocessable422,
} from '@old-server/utils/errors';
import { hook } from '@old-server/utils/hook-wrapper';
import type { Prisma, Project, User } from '@prisma/client';

export async function listClusters(userId?: User['id']) {
    const where: Prisma.ClusterWhereInput = userId
        ? {
              OR: [
                  // Sélectionne tous les clusters publics
                  { privacy: 'public' },
                  // Sélectionne les clusters associés aux projets dont l'user est membre
                  {
                      projects: { some: { members: { some: { userId } } } },
                  },
                  // Sélectionne les clusters associés aux projets dont l'user est owner
                  {
                      projects: { some: { ownerId: userId } },
                  },
                  // Sélectionne les clusters associés aux environnments appartenant à des projets dont l'user est membre
                  {
                      environments: {
                          some: { project: { members: { some: { userId } } } },
                      },
                  },
              ],
          }
        : {};
    const clusters = await listClustersQuery(where);
    return clusters.map(({ stages, ...cluster }) => ({
        ...cluster,
        stageIds: stages.map(({ id }) => id),
    }));
}

export async function getClusterAssociatedEnvironments(clusterId: string) {
    const clusterEnvironments = await getClusterEnvironments(clusterId);

    return clusterEnvironments.map((environment) => {
        return {
            project: environment.project?.name,
            name: environment.name,
            owner: environment.project.owner.email,
            cpu: environment.cpu,
            gpu: environment.gpu,
            memory: environment.memory,
        };
    });
}

export async function getClusterDetails(
    clusterId: string,
): Promise<ClusterDetails> {
    const { infos, projects, stages, kubeconfig, ...details } =
        await getClusterDetailsQuery(clusterId);
    return {
        ...details,
        infos: infos ?? '',
        projectIds: projects.map((project) => project.id),
        stageIds: stages.map(({ id }) => id),
        kubeconfig: {
            cluster: kubeconfig.cluster as unknown as Kubeconfig['cluster'],
            user: kubeconfig.user as unknown as Kubeconfig['user'],
        },
    };
}

export async function getClusterUsage(clusterId: string): Promise<Resources> {
    const clusterUsage = await prisma.environment.aggregate({
        _sum: {
            memory: true,
            cpu: true,
            gpu: true,
        },
        where: {
            clusterId,
        },
    });
    return {
        cpu: clusterUsage._sum.cpu ?? 0,
        gpu: clusterUsage._sum.gpu ?? 0,
        memory: clusterUsage._sum.memory ?? 0,
    };
}

export async function createCluster(
    data: typeof clusterContract.createCluster.body._type,
    userId: User['id'],
    requestId: string,
) {
    const isLabelTaken = await getClusterByLabel(data.label);
    if (isLabelTaken)
        return new BadRequest400('Ce label existe déjà pour un autre cluster');

    data.projectIds =
        data.privacy === ClusterPrivacy.PUBLIC ? [] : (data.projectIds ?? []);

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data;

    const clusterCreated = await createClusterQuery(
        clusterData,
        kubeconfig,
        zoneId,
    );

    if (data.privacy === ClusterPrivacy.DEDICATED && projectIds.length) {
        await linkClusterToProjects(clusterCreated.id, projectIds);
    }

    if (stageIds?.length) {
        await linkClusterToStages(clusterCreated.id, stageIds);
    }

    const hookReply = await hook.cluster.upsert(clusterCreated.id, zoneId);
    await addLogs({
        action: 'Create Cluster',
        data: hookReply,
        userId,
        requestId,
    });
    if (hookReply.failed) {
        return new Unprocessable422(
            'Echec des services à la création du cluster',
        );
    }

    return getClusterDetails(clusterCreated.id);
}

export async function updateCluster(
    data: typeof clusterContract.updateCluster.body._type,
    clusterId: Cluster['id'],
    userId: User['id'],
    requestId: string,
): Promise<ClusterDetails | ErrorResType> {
    if (data?.privacy === ClusterPrivacy.PUBLIC) delete data.projectIds;

    const schemaValidation = ClusterDetailsSchema.partial().safeParse({
        ...data,
        id: clusterId,
    });
    const validateResult = validateSchema(schemaValidation);
    if (validateResult instanceof ErrorResType) return validateResult;

    const dbCluster = await getClusterById(clusterId);
    if (!dbCluster) return new NotFound404();

    const { projectIds, stageIds, kubeconfig, zoneId, ...clusterData } = data;

    const clusterUpdated = await updateClusterQuery(
        clusterId,
        clusterData,
        // @ts-ignore
        kubeconfig,
    );

    // zone
    if (zoneId) {
        await linkZoneToClusters(zoneId, [clusterId]);
    }

    // projects
    const dbProjects = await getProjectsByClusterId(clusterId);

    let projectsToRemove: Project['id'][] = [];

    if (projectIds && clusterUpdated.privacy === ClusterPrivacy.DEDICATED) {
        await linkClusterToProjects(clusterId, projectIds);
        projectsToRemove =
            dbProjects
                ?.map((project) => project.id)
                ?.filter((dbProjectId) => !projectIds.includes(dbProjectId)) ??
            [];
    } else if (clusterUpdated.privacy === ClusterPrivacy.PUBLIC) {
        projectsToRemove = dbProjects?.map((project) => project.id) ?? [];
    }

    for (const projectId of projectsToRemove) {
        await removeClusterFromProject(clusterUpdated.id, projectId);
    }

    // stages
    if (stageIds) {
        await linkClusterToStages(clusterId, stageIds);

        const dbStages = await listStagesByClusterId(clusterId);
        if (dbStages) {
            for (const stage of dbStages) {
                if (!stageIds.includes(stage.id)) {
                    await removeClusterFromStage(clusterUpdated.id, stage.id);
                }
            }
        }
    }

    const hookReply = await hook.cluster.upsert(clusterId, dbCluster.zoneId);
    await addLogs({
        action: 'Update Cluster',
        data: hookReply,
        userId,
        requestId,
    });
    if (hookReply.failed) {
        return new Unprocessable422(
            'Echec des services à la mise à jour du cluster',
        );
    }

    return getClusterDetails(clusterId);
}

interface DeleteClusterArgs {
    clusterId: Cluster['id'];
    userId?: User['id'];
    requestId: string;
    force?: boolean;
}
export async function deleteCluster({
    clusterId,
    requestId,
    force,
    userId,
}: DeleteClusterArgs) {
    let message: string | null = null;
    if (force) {
        const envs = await prisma.environment.deleteMany({
            where: { clusterId },
        });
        message = `${envs.count} environnements supprimés de force, n'oubliez pas de reprovisionner les projets concernés`;
    } else {
        const environment = await prisma.environment.findFirst({
            where: { clusterId },
        });
        if (environment)
            return new BadRequest400(
                'Impossible de supprimer le cluster, des environnements en activité y sont déployés',
            );
    }

    const hookReply = await hook.cluster.delete(clusterId);
    await addLogs({
        action: 'Delete Cluster',
        data: hookReply,
        userId,
        requestId,
    });
    if (hookReply.failed) {
        return new Unprocessable422(
            'Echec des services à la suppression du cluster',
        );
    }

    await deleteClusterQuery(clusterId);
    return message;
}
