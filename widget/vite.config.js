import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'ColibriWidget',
            formats: ['iife', 'es'],
            fileName: (format) => format === 'iife' ? 'colibri-widget.v1.js' : 'colibri-widget.v1.es.js',
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
        sourcemap: true,
        minify: 'esbuild',
    },
});
