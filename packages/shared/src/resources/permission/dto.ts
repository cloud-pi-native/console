import { EnvironmentModel } from '../environment'
import { ProjectModel } from '../project'
import { UserModel } from '../user'

export type CreatePermissionDto = {
  body: {
    level: number
    userId: UserModel['id']
  },
  params: {
    projectId: ProjectModel['id']
    environmentId: EnvironmentModel['id']
  }
}

export type UpdatePermissionDto = {
  body: CreatePermissionDto['body']
  params: CreatePermissionDto['params']
}

export type DeletePermissionDto = {
  params: Partial<CreatePermissionDto['params']> & {
    userId: UserModel['id']
  }
}

export type GetPermissionsDto = {
  params: CreatePermissionDto['params']
}
