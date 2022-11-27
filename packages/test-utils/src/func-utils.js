export const repeatFn = nb => fn => Array.from({ length: nb }).map(() => fn())
