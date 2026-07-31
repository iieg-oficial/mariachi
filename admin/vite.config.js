import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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
    } = env;

    const mapalabTarget = VITE_MAPALAB_PROXY_URL || 'http://mapalab-dev-frontend-1:3006';

    const plugins = [react()];

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
                '/acervo/thumb': {
                    target: env.VITE_ACERVO_THUMB_PROXY_URL || 'http://api:8000',
                    changeOrigin: true,
                },
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
            sourcemap: false,
            rolldownOptions: {
                output: {
                    codeSplitting: {
                        groups: [
                            {
                                name: 'react-vendor',
                                test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
                                priority: 30,
                            },
                            {
                                name: 'antd',
                                test: /node_modules[\\/](antd|@ant-design)[\\/]/,
                                priority: 20,
                            },
                            {
                                name: 'dnd-kit',
                                test: /node_modules[\\/]@dnd-kit[\\/]/,
                                priority: 10,
                            },
                        ],
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
