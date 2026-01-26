import { APPROVAL_STATUS } from '@constants/approvalConstants';

export const searchablePages = [
    {
        id: '1',
        title: 'Página Principal',
        slug: '/inicio',
        description: 'Página de inicio del sitio web',
        status: APPROVAL_STATUS.PUBLISHED,
        author: 'Juan Pérez',
        lastModified: new Date('2024-01-15'),
        tags: ['homepage', 'principal'],
        wordCount: 450,
        type: 'page'
    },
    {
        id: '2',
        title: 'Acerca de Nosotros',
        slug: '/nosotros',
        description: 'Información sobre la organización',
        status: APPROVAL_STATUS.APPROVED,
        author: 'María García',
        lastModified: new Date('2024-01-20'),
        tags: ['institucional'],
        wordCount: 320,
        type: 'page'
    },
    {
        id: '3',
        title: 'Servicios',
        slug: '/servicios',
        description: 'Catálogo de servicios ofrecidos',
        status: APPROVAL_STATUS.DRAFT,
        author: 'Juan Pérez',
        lastModified: new Date('2024-01-25'),
        tags: ['servicios', 'productos'],
        wordCount: 680,
        type: 'page'
    },
    {
        id: '4',
        title: 'Contacto',
        slug: '/contacto',
        description: 'Formulario de contacto y ubicación',
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        author: 'Ana López',
        lastModified: new Date('2024-01-22'),
        tags: ['contacto'],
        wordCount: 180,
        type: 'page'
    },
    {
        id: '5',
        title: 'Blog: Novedades 2024',
        slug: '/blog/novedades-2024',
        description: 'Artículo sobre las novedades del año',
        status: APPROVAL_STATUS.PUBLISHED,
        author: 'María García',
        lastModified: new Date('2024-01-18'),
        tags: ['blog', 'noticias'],
        wordCount: 890,
        type: 'page'
    }
];

export const globalSearchData = [
    {
        id: 'page-1',
        title: 'Página Principal',
        type: 'page',
        url: '/pages/edit/1',
        category: 'Páginas'
    },
    {
        id: 'page-2',
        title: 'Acerca de Nosotros',
        type: 'page',
        url: '/pages/edit/2',
        category: 'Páginas'
    },
    {
        id: 'page-3',
        title: 'Servicios',
        type: 'page',
        url: '/pages/edit/3',
        category: 'Páginas'
    },
    {
        id: 'user-1',
        title: 'Usuarios',
        type: 'user',
        url: '/users',
        category: 'Sistema'
    },
    {
        id: 'media-1',
        title: 'Multimedia',
        type: 'media',
        url: '/media',
        category: 'Contenido'
    },
    {
        id: 'menu-1',
        title: 'Menús',
        type: 'menu',
        url: '/menu',
        category: 'Diseño'
    },
    {
        id: 'layout-1',
        title: 'Layouts',
        type: 'layout',
        url: '/layouts',
        category: 'Diseño'
    },
    {
        id: 'style-1',
        title: 'Estilos',
        type: 'style',
        url: '/styles',
        category: 'Diseño'
    }
];
