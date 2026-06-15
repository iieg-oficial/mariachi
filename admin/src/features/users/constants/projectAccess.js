export const PROJECT_META = {
    portal: {
        kind: 'platform',
        editor: 'Crea y edita las páginas y el menú del sitio público, y administra sus archivos en el Acervo.',
        viewer: 'Consulta y previsualiza; no guarda cambios.',
    },
    mapalab: {
        kind: 'platform',
        editor: 'Edita capas, eventos, símbolos e inicio del visor, y administra sus archivos en el Acervo.',
        viewer: 'Consulta y previsualiza; no guarda cambios.',
    },
    sieej: {
        kind: 'platform',
        editor: 'Gestiona los formularios y grupos de SIEEJ, y administra sus archivos en el Acervo.',
        viewer: 'Consulta los formularios; no edita.',
        external: 'Permite responder y enviar los formularios de SIEEJ.',
    },
    iieg: {
        kind: 'acervo',
        note: 'Acceso a los assets institucionales del Acervo (logos, íconos, fuentes).',
    },
    mariachi: {
        kind: 'acervo',
        note: 'Acceso a los archivos administrativos privados del Acervo.',
    },
};

const DEFAULT_PROJECT_META = {
    kind: 'platform',
    editor: 'Crea y edita el contenido del proyecto, y administra sus archivos en el Acervo.',
    viewer: 'Consulta y previsualiza; no guarda cambios.',
};

export const metaFor = (slug) => PROJECT_META[slug] || DEFAULT_PROJECT_META;

export const EXTERNAL_SUBS = {
    sieej: 'dependency',
};

export const allowedSlugsForRole = (role, projects = []) => {
    if (role === 'editora') return projects.map((p) => p.slug);
    if (role === 'externo') return projects.filter((p) => metaFor(p.slug).external).map((p) => p.slug);
    return [];
};
