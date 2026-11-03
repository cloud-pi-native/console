import type { Prisma } from '@prisma/client'
import type { Fixtures } from './fixtures.utils.ts'

// Caller owns the transaction. Explicit delegates keep every fixture checked
// against the generated Prisma inputs, including tables absent from the dataset.
export async function replaceFixtures(tx: Prisma.TransactionClient, fixtures: Fixtures): Promise<void> {
  await tx.deploymentExternalValueSource.deleteMany()
  await tx.deploymentInternalValueSource.deleteMany()
  await tx.deploymentSource.deleteMany()
  await tx.deployment.deleteMany()
  await tx.log.deleteMany()
  await tx.personalAccessToken.deleteMany()
  await tx.adminToken.deleteMany()
  await tx.projectMembers.deleteMany()
  await tx.projectRole.deleteMany()
  await tx.projectPlugin.deleteMany()
  await tx.repository.deleteMany()
  await tx.environment.deleteMany()
  await tx.projectClusterHistory.deleteMany()
  await tx.project.deleteMany()
  await tx.cluster.deleteMany()
  await tx.kubeconfig.deleteMany()
  await tx.zone.deleteMany()
  await tx.stage.deleteMany()
  await tx.user.deleteMany()
  await tx.adminRole.deleteMany()
  await tx.adminPlugin.deleteMany()
  await tx.systemSetting.deleteMany()

  await tx.adminRole.createMany({ data: fixtures.adminRole })
  await tx.adminPlugin.createMany({ data: fixtures.adminPlugin })
  await tx.systemSetting.createMany({ data: fixtures.systemSetting })
  await tx.user.createMany({ data: fixtures.user })
  await tx.adminToken.createMany({ data: fixtures.adminToken })
  await tx.personalAccessToken.createMany({ data: fixtures.personalAccessToken })
  await tx.kubeconfig.createMany({ data: fixtures.kubeconfig })
  await tx.zone.createMany({ data: fixtures.zone })
  await tx.stage.createMany({ data: fixtures.stage })
  await tx.cluster.createMany({ data: fixtures.cluster })
  await tx.project.createMany({ data: fixtures.project })
  await tx.environment.createMany({ data: fixtures.environment })
  await tx.repository.createMany({ data: fixtures.repository })
  await tx.projectClusterHistory.createMany({ data: fixtures.projectClusterHistory })
  await tx.projectMembers.createMany({ data: fixtures.projectMembers })
  await tx.projectRole.createMany({ data: fixtures.projectRole })
  await tx.projectPlugin.createMany({ data: fixtures.projectPlugin })
  await tx.deployment.createMany({ data: fixtures.deployment })
  await tx.deploymentSource.createMany({ data: fixtures.deploymentSource })
  await tx.deploymentInternalValueSource.createMany({ data: fixtures.deploymentInternalValueSource })
  await tx.deploymentExternalValueSource.createMany({ data: fixtures.deploymentExternalValueSource })
  await tx.log.createMany({ data: fixtures.log })

  for (const [, rows] of fixtures.associations) {
    for (const row of rows) {
      await tx.cluster.update({
        where: { id: row.id },
        data: {
          ...(row.projects ? { projects: { connect: row.projects } } : {}),
          ...(row.stages ? { stages: { connect: row.stages } } : {}),
        },
      })
    }
  }
}
