import { type Hook, createHook } from './hook.js'

export type CheckServicesValidateArgs = void
export type CheckServicesExecArgs = void
export type FetchOrganizationsValidateArgs = void
export type FetchOrganizationsExecArgs = void

export const checkServices: Hook<CheckServicesExecArgs, CheckServicesValidateArgs> = createHook()
export const fetchOrganizations: Hook<FetchOrganizationsExecArgs, FetchOrganizationsValidateArgs> = createHook(true)
export const purgeAll: Hook<void, void> = createHook()
