import { PROVIDERS } from 'alchemy'
import { describe, expect, it, vi } from 'vitest'
import './index.js'

function createCtx<Output>(phase: string, output?: Output) {
  const ctx: any = {
    phase,
    output,
    create: vi.fn((next: Output) => {
      ctx.output = next
      return {}
    }),
    destroy: vi.fn(() => ({})),
  }
  return ctx
}

describe('gitlab resources', () => {
  it('gitlabGroup create: does not create when group exists', async () => {
    const provider = PROVIDERS.get('gitlab:Group')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupsShow: vi.fn().mockResolvedValue({ id: 1, name: 'n', path: 'p' }),
      groupsCreate: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'group-x', { client, name: 'n', path: 'p', parentId: 99 })

    expect(client.groupsCreate).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ id: 1, name: 'n', path: 'p' })
  })

  it('gitlabGroup create: creates when group does not exist', async () => {
    const provider = PROVIDERS.get('gitlab:Group')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupsShow: vi.fn().mockRejectedValue(new Error('404')),
      groupsCreate: vi.fn().mockResolvedValue({ id: 2, name: 'n', path: 'p' }),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'group-x', { client, name: 'n', path: 'p', parentId: 99 })

    expect(client.groupsCreate).toHaveBeenCalledWith('n', 'p', expect.objectContaining({ parentId: 99 }))
    expect(ctx.create).toHaveBeenCalledWith({ id: 2, name: 'n', path: 'p' })
  })

  it('gitlabProject create: does not create when project exists in namespace', async () => {
    const provider = PROVIDERS.get('gitlab:Project')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupsAllProjects: vi.fn().mockResolvedValue({ data: [{ id: 10, name: 'repo', path: 'repo' }] }),
      projectsCreate: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'repo-x', { client, name: 'repo', path: 'repo', namespaceId: 1 })

    expect(client.projectsCreate).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ id: 10, name: 'repo', path: 'repo' })
  })

  it('gitlabProject create: creates when project is missing in namespace', async () => {
    const provider = PROVIDERS.get('gitlab:Project')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupsAllProjects: vi.fn().mockResolvedValue({ data: [] }),
      projectsCreate: vi.fn().mockResolvedValue({ id: 11, name: 'repo', path: 'repo' }),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'repo-x', { client, name: 'repo', path: 'repo', namespaceId: 1, description: 'd', ciConfigPath: '.gitlab-ci.yml' })

    expect(client.projectsCreate).toHaveBeenCalledWith({
      name: 'repo',
      path: 'repo',
      namespaceId: 1,
      description: 'd',
      ciConfigPath: '.gitlab-ci.yml',
    })
    expect(ctx.create).toHaveBeenCalledWith({ id: 11, name: 'repo', path: 'repo' })
  })

  it('gitlabGroupMember create: edits access level when member exists with different access', async () => {
    const provider = PROVIDERS.get('gitlab:GroupMember')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupMembersAll: vi.fn().mockResolvedValue({ data: [{ id: 42, access_level: 10 }] }),
      groupMembersEdit: vi.fn(),
      groupMembersAdd: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'member-x', { client, groupId: 1, userId: 42, accessLevel: 30 })

    expect(client.groupMembersEdit).toHaveBeenCalledWith(1, 42, 30)
    expect(client.groupMembersAdd).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ groupId: 1, userId: 42, accessLevel: 30 })
  })

  it('gitlabGroupMember create: adds member when missing', async () => {
    const provider = PROVIDERS.get('gitlab:GroupMember')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupMembersAll: vi.fn().mockResolvedValue({ data: [] }),
      groupMembersEdit: vi.fn(),
      groupMembersAdd: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'member-x', { client, groupId: 1, userId: 42, accessLevel: 30 })

    expect(client.groupMembersAdd).toHaveBeenCalledWith(1, 42, 30)
    expect(client.groupMembersEdit).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ groupId: 1, userId: 42, accessLevel: 30 })
  })

  it('gitlabUser create: reuses existing and edits flags when isAdmin/isAuditor provided', async () => {
    const provider = PROVIDERS.get('gitlab:User')
    if (!provider) throw new Error('Missing provider')

    const client = {
      usersAll: vi.fn().mockResolvedValue({ data: [{ id: 7, username: 'u', email: 'e', name: 'n' }] }),
      usersEdit: vi.fn(),
      usersCreate: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'user-x', { client, email: 'e', username: 'u', name: 'n', isAdmin: true, isAuditor: false })

    expect(client.usersCreate).not.toHaveBeenCalled()
    expect(client.usersEdit).toHaveBeenCalledWith(7, { admin: true, auditor: false, canCreateGroup: true })
    expect(ctx.create).toHaveBeenCalledWith({ id: 7, username: 'u', email: 'e', name: 'n' })
  })

  it('gitlabProjectCustomAttribute update: only sets when value changes', async () => {
    const provider = PROVIDERS.get('gitlab:ProjectCustomAttribute')
    if (!provider) throw new Error('Missing provider')

    const client = {
      projectCustomAttributesSet: vi.fn(),
    }

    const ctx = createCtx('update', { projectId: 1, key: 'k', value: 'old' })
    await provider.handler.call(ctx, 'attr-x', { client, projectId: 1, key: 'k', value: 'new' })

    expect(client.projectCustomAttributesSet).toHaveBeenCalledWith(1, 'k', 'new')
    expect(ctx.create).toHaveBeenCalledWith({ projectId: 1, key: 'k', value: 'new' })
  })

  it('gitlabGroupCustomAttribute update: only sets when value changes', async () => {
    const provider = PROVIDERS.get('gitlab:GroupCustomAttribute')
    if (!provider) throw new Error('Missing provider')

    const client = {
      groupCustomAttributesSet: vi.fn(),
    }

    const ctx = createCtx('update', { groupId: 1, key: 'k', value: 'old' })
    await provider.handler.call(ctx, 'attr-x', { client, groupId: 1, key: 'k', value: 'new' })

    expect(client.groupCustomAttributesSet).toHaveBeenCalledWith(1, 'k', 'new')
    expect(ctx.create).toHaveBeenCalledWith({ groupId: 1, key: 'k', value: 'new' })
  })

  it('gitlabUserCustomAttribute create: sets value', async () => {
    const provider = PROVIDERS.get('gitlab:UserCustomAttribute')
    if (!provider) throw new Error('Missing provider')

    const client = {
      userCustomAttributesSet: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'attr-x', { client, userId: 7, key: 'k', value: 'v' })

    expect(client.userCustomAttributesSet).toHaveBeenCalledWith(7, 'k', 'v')
    expect(ctx.create).toHaveBeenCalledWith({ userId: 7, key: 'k', value: 'v' })
  })

  it('gitlabCommit create: creates commit', async () => {
    const provider = PROVIDERS.get('gitlab:Commit')
    if (!provider) throw new Error('Missing provider')

    const client = {
      commitsCreate: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'commit-x', { client, projectId: 1, branch: 'main', commitMessage: 'm', actions: [] })

    expect(client.commitsCreate).toHaveBeenCalledWith(1, 'main', 'm', [])
    expect(ctx.create).toHaveBeenCalledWith({ projectId: 1, branch: 'main', commitMessage: 'm', actionsCount: 0 })
  })

  it('gitlabMirrorCreds create: reuses valid vault token', async () => {
    const provider = PROVIDERS.get('gitlab:MirrorCreds')
    if (!provider) throw new Error('Missing provider')

    const client = {
      validateTokenForGroup: vi.fn().mockResolvedValue(undefined),
      groupAccessTokensCreate: vi.fn(),
    }

    const vault = {
      read: vi.fn().mockResolvedValue({ data: { MIRROR_USER: 'bot', MIRROR_TOKEN: 'tok' } }),
      write: vi.fn(),
      destroy: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'mirror-creds-x', { client, vault, groupId: 1, tokenName: 't', vaultPath: 'tech/GITLAB_MIRROR' })

    expect(client.groupAccessTokensCreate).not.toHaveBeenCalled()
    expect(vault.write).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ MIRROR_USER: 'bot', MIRROR_TOKEN: 'tok' })
  })

  it('gitlabMirrorTriggerToken create: reuses existing trigger token from vault when matching repoId', async () => {
    const provider = PROVIDERS.get('gitlab:MirrorTriggerToken')
    if (!provider) throw new Error('Missing provider')

    const client = {
      pipelineTriggerTokensCreate: vi.fn(),
    }

    const vault = {
      read: vi.fn().mockResolvedValue({ data: { GIT_MIRROR_TOKEN: 'tok', GIT_MIRROR_PROJECT_ID: 123 } }),
      write: vi.fn(),
      destroy: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'mirror-trigger-x', { client, vault, repoId: 123, description: 'd', vaultPath: 'GITLAB' })

    expect(client.pipelineTriggerTokensCreate).not.toHaveBeenCalled()
    expect(ctx.create).toHaveBeenCalledWith({ token: 'tok', repoId: 123 })
  })

  it('gitlabEnsureFiles create: creates missing files and commits once', async () => {
    const provider = PROVIDERS.get('gitlab:EnsureFiles')
    if (!provider) throw new Error('Missing provider')

    const client = {
      repositoryFilesShow: vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(Object.assign(new Error('not found'), { cause: { response: { status: 404 } } })),
      commitsCreate: vi.fn(),
    }

    const ctx = createCtx('create')
    await provider.handler.call(ctx, 'ensure-x', {
      client,
      projectId: 1,
      branch: 'main',
      commitMessage: 'm',
      files: [
        { path: 'exists.txt', content: 'a', executable: false },
        { path: 'missing.txt', content: 'b', executable: true },
      ],
    })

    expect(client.commitsCreate).toHaveBeenCalledWith(1, 'main', 'm', [
      { action: 'create', file_path: 'missing.txt', content: 'b', execute_filemode: true },
    ])
    expect(ctx.create).toHaveBeenCalledWith({ projectId: 1, ensuredPaths: ['exists.txt', 'missing.txt'] })
  })
})
