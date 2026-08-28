export const ROADMAP = [
    {
        slug: 'vine',
        versiones: [
            {
                version: '1.0.0',
                fecha: null,
                motivo: 'Deja de ser sistema aparte: las asistencias se administran desde el CMS.',
            },
        ],
    },
    {
        slug: 'mariachi',
        versiones: [
            {
                version: '2.0.0',
                fecha: '2026-08-10',
                motivo: 'Retira su login propio: la identidad la emite minerva y la autorización deja de mirar el rol.',
            },
            {
                version: '1.0.0',
                fecha: '2026-05-14',
                motivo: 'Primera versión estable en producción; desde aquí el versionado es SemVer de producción.',
            },
        ],
    },
    {
        slug: 'sieej',
        versiones: [
            {
                version: '2.0.0',
                fecha: '2026-08-10',
                motivo: 'Su pantalla de login se va a minerva; no se puede desplegar sin mariachi 2.0.0.',
            },
        ],
    },
    {
        slug: 'sextante',
        versiones: [
            {
                version: '2.0.0',
                fecha: '2026-07-31',
                motivo: 'El servicio deja de llamarse geoserver: cambian contenedores, red y la URL pública.',
            },
            {
                version: '1.0.0',
                fecha: '2026-02-25',
                motivo: 'Primer despliegue a producción, con respaldo y restauración de los datastores.',
            },
        ],
    },
    {
        slug: 'huachicol',
        versiones: [
            {
                version: '2.0.0',
                fecha: '2026-07-21',
                motivo: 'Se apaga el stack de observabilidad; queda el monitor ligero de /ontoy.',
            },
        ],
    },
    {
        slug: 'mapalab',
        versiones: [
            {
                version: '1.0.0',
                fecha: '2026-03-27',
                motivo: 'El visor sale estable: descarga de capas, exportación con leyendas y capas temporales.',
            },
        ],
    },
    {
        slug: 'gateway-hub',
        versiones: [
            {
                version: '1.0.0',
                fecha: '2026-03-13',
                motivo: 'El nginx de entrada toma el ruteo de todo el ecosistema.',
            },
        ],
    },
    {
        slug: 'dataengine',
        versiones: [
            {
                version: '1.0.0',
                fecha: '2026-02-25',
                motivo: 'Cluster PostgreSQL con réplica, SSL obligatorio y respaldos diarios al Acervo.',
            },
        ],
    },
];
