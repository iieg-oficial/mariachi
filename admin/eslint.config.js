import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
    { ignores: ['dist', 'coverage'] },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'jsx-a11y': jsxA11y,
        },
        settings: {
            'jsx-a11y': {
                components: {
                    Checkbox: 'input',
                    Switch: 'input',
                    Input: 'input',
                    InputNumber: 'input',
                    Select: 'select',
                    Textarea: 'textarea',
                    Button: 'button',
                },
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.flatConfigs.recommended.rules,
            'indent': ['error', 4],
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
            'no-restricted-imports': ['error', {
                patterns: [{
                    group: ['*.png', '**/*.png'],
                    message: 'PNG imports no permitidos. Convierte a WebP (cwebp -lossless) o usa SVG. Si es estrictamente necesario, justifica en PR y usa eslint-disable-next-line.',
                }],
            }],
            'max-lines': ['error', {
                'max': 300,
                'skipBlankLines': true,
                'skipComments': true,
            }],
            'quotes': ['error', 'single', {
                'avoidEscape': true,
                'allowTemplateLiterals': true,
            }],
            'template-curly-spacing': ['error', 'never'],
            'react-hooks/exhaustive-deps': 'warn',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/immutability': 'warn',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
    },
    {
        files: ['**/test/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/tests/**/*.{js,jsx}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
    },
    {
        files: [
            'src/features/mapalab-eventos/pages/EventoEditPage.jsx',
            'src/features/mapalab-home/components/sectionEditors.jsx',
            'src/features/mapalab-home/pages/HomePage.jsx',
            'src/features/mapalab-layers/components/LayersTreeSider.jsx',
            'src/features/mapalab-layers/components/layersEditor/CqlFilterBuilder.jsx',
            'src/features/mapalab-geoserver-files/pages/GeoserverFilesPage.jsx',
            'src/features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor.jsx',
            'src/features/mapalab-layers/components/layersEditor/LayerMetadataSection.jsx',
            'src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx',
            'src/features/mapalab-layers/components/layersEditor/LayerStatsSection.jsx',
            'src/features/mapalab-layers/pages/InitialLayerOrderPage.jsx',
            'src/features/mapalab-layers/pages/LayerEditPage.jsx',
            'src/features/media/api/mediaService.js',
            'src/features/media/components/FilePicker.jsx',
            'src/features/media/pages/MediaPage.jsx',
            'src/features/portal-pages/components/SEOAnalyzer.jsx',
            'src/features/portal-pages/components/SEOEditor.jsx',
            'src/features/portal-pages/constants/pageTemplates.js',
            'src/features/users/pages/UsersPage.jsx',
        ],
        rules: {
            'max-lines': 'off',
        },
    },
    {
        files: [
            'src/main.jsx',
            'src/app/sider-config.jsx',
            'src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx',
        ],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
];
