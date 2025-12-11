import { mergeConfig } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig as any,
    defineConfig({
        test: {
            reporters: ['default', 'hanging-process'],
            environment: 'node',
            testTimeout: 2000,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'lcov'],
                include: ['src/**'],
                exclude: [
                    '**/types',
                    '**/mocks',
                    '**/*.spec',
                    '**/*.d',
                    '**/*.vue',
                    '**/queries',
                    '**/mocks',
                ],
            },
            include: ['src/**/*.spec.{ts,js}'],
            exclude: [...configDefaults.exclude, 'e2e/*'],
            setupFiles: ['./vitest-init'],
            root: __dirname,
            pool: 'forks',
        },
    }),
);
