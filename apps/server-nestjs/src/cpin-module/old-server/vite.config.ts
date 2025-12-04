/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [],
    resolve: {
        alias: {
            '@': path.join(__dirname, '..', '/src'),
        },
    },
    test: {
        poolMatchGlobs: [['**/resources/**/*.spec.ts', 'forks']],
    },
} as any);
