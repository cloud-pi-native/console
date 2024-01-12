import { type Hook, createHook } from './hook.js'

export type CheckServicesValidateArgs = Record<string, never>
export type CheckServicesExecArgs = Record<string, never>
export type FetchOrganizationsValidateArgs = Record<string, never>
export type FetchOrganizationsExecArgs = Record<string, never>

export const checkServices: Hook<CheckServicesExecArgs, CheckServicesValidateArgs> = createHook()
export const fetchOrganizations: Hook<FetchOrganizationsExecArgs, FetchOrganizationsValidateArgs> = createHook(true)
