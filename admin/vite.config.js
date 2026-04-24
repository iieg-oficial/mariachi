import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const {
        VITE_ADMIN_PORT,
        VITE_ADMIN_HOST,
        VITE_MAPALAB_PROXY_URL,
        SENTRY_AUTH_TOKEN,
        SENTRY_ORG,
        SENTRY_PROJECT,
    } = env;

    const mapalabTarget = VITE_MAPALAB_PROXY_URL || 'http://mapalab-dev-frontend-1:3006';
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
            host: VITE_ADMIN_HOST ?? '0.0.0.0',
            port: Number(VITE_ADMIN_PORT ?? '3011'),
            strictPort: true,
            watch: {
                usePolling: true,
            },
            proxy: {
                '/mapalab': {
                    target: mapalabTarget,
                    changeOrigin: false,
                    headers: { host: 'localhost' },
                    rewrite: (p) => p.replace(/^\/mapalab/, ''),
                },
            },
        },
        base: '/mariachi/',
        build: {
            outDir: 'dist',
            sourcemap: sentryEnabled,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'react-vendor': ['react', 'react-dom', 'react-router'],
                        'antd': ['antd', '@ant-design/icons'],
                        'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
                        'sentry': ['@sentry/react'],
                    },
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@app': path.resolve(__dirname, './src/app'),
                '@features': path.resolve(__dirname, './src/features'),
                '@shared': path.resolve(__dirname, './src/shared'),
                '@assets': path.resolve(__dirname, './src/assets'),
            },
        },
    };
});
