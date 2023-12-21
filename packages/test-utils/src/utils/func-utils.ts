// export const repeatFn = <T>(nb: number) => (
// fn: (optionalParam?: any) => T,
// optionalParam?: any) => Array.from({ length: nb }).map(() => fn(optionalParam)) as Array<T>
export const repeatFn = <T, P>(
  nb: number,
  fn: (optionalParam?: P) => T,
  optionalParam?: P,
) => Array.from({ length: nb }).map(() => fn(optionalParam))
