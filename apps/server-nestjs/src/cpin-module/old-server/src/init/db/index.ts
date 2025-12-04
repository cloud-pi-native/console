import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app.js';
import prisma from '@old-server/prisma.js';

import { modelKeys } from './utils.js';

type ExtractKeysWithFields<T> = {
    [K in keyof T]: T[K] extends { fields: any } ? K : never;
}[keyof T];

type Models = ExtractKeysWithFields<typeof prisma>;

type Imports = Partial<Record<Models, object[]>> & {
    associations: [Models, any[]];
};

@Injectable()
export class InitDBService {
    constructor(private readonly appService: AppService) {}

    async initDb(data: Imports) {
        const dataStringified = JSON.stringify(data);
        const dataParsed = JSON.parse(dataStringified, (key, value) => {
            try {
                if (['permissions', 'everyonePerms'].includes(key)) {
                    return BigInt(value.slice(0, value.length - 1));
                }
            } catch (_error) {
                return value;
            }
            return value;
        });
        this.appService.logger.info('Drop tables');
        for (const modelKey of modelKeys.toReversed()) {
            // @ts-ignore
            await prisma[modelKey].deleteMany();
        }
        this.appService.logger.info('Import models');
        for (const modelKey of modelKeys) {
            // @ts-ignore
            await prisma[modelKey].createMany({ data: dataParsed[modelKey] });
        }
        this.appService.logger.info('Import associations');
        for (const [modelKey, rows] of dataParsed.associations) {
            for (const row of rows) {
                const idKey = 'id';
                const connectKeys = Object.keys(row).filter(
                    (key) => key !== idKey,
                );
                const dataConnects = connectKeys.reduce(
                    (acc, curr) => {
                        acc[curr] = { connect: row[curr] };
                        return acc;
                    },
                    {} as Record<string, { connect: any[] }>,
                );
                // @ts-ignore
                await prisma[modelKey].update({
                    where: { id: row.id },
                    data: dataConnects,
                });
            }
        }
        this.appService.logger.info('End import');
    }
}
