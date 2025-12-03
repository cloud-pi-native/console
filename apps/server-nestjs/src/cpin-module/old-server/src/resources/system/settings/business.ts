import type { UpsertSystemSettingBody } from '@cpn-console/shared';

import {
    getSystemSettings as getSystemSettingsQuery,
    upsertSystemSetting as upsertSystemSettingQuery,
} from './queries.js';

export const getSystemSettings = (key?: string) =>
    getSystemSettingsQuery({ key });

export const upsertSystemSetting = (
    newSystemSetting: UpsertSystemSettingBody,
) => upsertSystemSettingQuery(newSystemSetting);
