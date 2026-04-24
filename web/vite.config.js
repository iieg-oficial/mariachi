import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = env;
    const sentryEnabled = Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT);

    const plugins = [
        react(),
        visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
        }),
    ];

    if (sentryEnabled) {
        plugins.push(
            sentryVitePlugin({
                org: SENTRY_ORG,
                project: SENTRY_PROJECT,
                authToken: SENTRY_AUTH_TOKEN,
            }),
        );
    }

    return {
        plugins,
        root: '.',
        server: {
            host: env.VITE_WEB_HOST ?? '0.0.0.0',
            port: Number(env.VITE_WEB_PORT ?? '3010'),
            strictPort: true,
            watch: {
                usePolling: true,
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: sentryEnabled,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom', 'react-router'],
                        'sentry': ['@sentry/react'],
                    },
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@layouts': path.resolve(__dirname, './src/layouts'),
                '@providers': path.resolve(__dirname, './src/providers'),
                '@assets': path.resolve(__dirname, './src/assets'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@services': path.resolve(__dirname, './src/services'),
                '@contexts': path.resolve(__dirname, './src/contexts'),
            },
        },
    };
});
