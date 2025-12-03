import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: path.join('src', 'prisma', 'schema'),
    migrations: {
        path: path.join('src', 'prisma', 'migrations'),
    },
});
