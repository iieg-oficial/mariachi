export const ROLE_OPTIONS = [
    {
        value: 'tetlamamakani',
        label: 'Tetlamamakani',
        color: 'red',
        description: 'Acceso total al panel y a todos los proyectos. Gestiona usuarios, revisiones y configuración. No requiere asignar proyectos.',
    },
    {
        value: 'editora',
        label: 'Editora',
        color: 'blue',
        description: 'Staff del IIEG. Entra al panel y trabaja solo en los proyectos que le asignes abajo, como editor o solo lectura.',
    },
    {
        value: 'externo',
        label: 'Externo',
        color: 'green',
        description: 'No accede al panel administrativo. Usa las plataformas públicas (por ejemplo SIEEJ) según los proyectos que le asignes abajo.',
    },
];

export const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));

export const ROLE_COLOR = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.color]));

export const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const roleLabel = (role) => ROLE_LABEL[role] || role;

export const roleDescription = (role) => ROLE_OPTIONS.find((o) => o.value === role)?.description;

export const PROJECT_ROLE_LABEL = { editor: 'Editor', viewer: 'Viewer' };
