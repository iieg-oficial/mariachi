import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const { VITE_ADMIN_PORT, VITE_ADMIN_HOST, VITE_MAPALAB_PROXY_URL } = env;

    const mapalabTarget = VITE_MAPALAB_PROXY_URL || 'http://mapalab-dev-frontend-1:3006';

    return {
        plugins: [react()],
        root: '.',
        server: {
            host: VITE_ADMIN_HOST ?? '0.0.0.0',
            port: Number(VITE_ADMIN_PORT ?? '3011'),
            strictPort: true,
            watch: {
                usePolling: true
            },
            proxy: {
                '/mapalab': {
                    target: mapalabTarget,
                    changeOrigin: false,
                    headers: { host: 'localhost' },
                    rewrite: (path) => path.replace(/^\/mapalab/, '')
                }
            }
        },
        base: '/administrador/',
        build: {
            outDir: 'dist',
            sourcemap: true
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
                '@constants': path.resolve(__dirname, './src/constants')
            },
        },
    };
});

