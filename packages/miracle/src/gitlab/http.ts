export class GitlabHttpError extends Error {
  public readonly status: number
  public readonly method: string
  public readonly url: string
  public description: string

  constructor(args: { status: number, method: string, url: string, description: string }) {
    super(`GitLab API ${args.status} ${args.method} ${args.url}`)
    this.status = args.status
    this.method = args.method
    this.url = args.url
    this.description = args.description
  }
}

export function encodePathSegment(path: string) {
  return encodeURIComponent(path)
}
