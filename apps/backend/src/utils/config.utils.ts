export function optIn(condition: string): (env: NodeJS.ProcessEnv) => boolean {
  return (env: NodeJS.ProcessEnv) => env[condition] === 'true'
}
