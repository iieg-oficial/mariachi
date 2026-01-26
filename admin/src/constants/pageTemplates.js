export const PAGE_TEMPLATES = {
    BLANK: {
        id: 'blank',
        name: 'Página en Blanco',
        description: 'Comienza con una página vacía',
        icon: 'FileOutlined',
        template: {
            sections: [],
            seo: {
                metaTitle: '',
                metaDescription: '',
                metaKeywords: '',
                ogTitle: '',
                ogDescription: '',
                ogImage: '',
                ogUrl: '',
                twitterCard: 'summary_large_image',
                twitterTitle: '',
                twitterDescription: '',
                twitterImage: '',
                canonicalUrl: '',
                noIndex: false,
                noFollow: false
            }
        }
    },
    COMUNICADO: {
        id: 'comunicado',
        name: 'Comunicado Oficial',
        description: 'Formato para comunicados de prensa y anuncios oficiales',
        icon: 'NotificationOutlined',
        template: {
            sections: [
                {
                    id: 1,
                    columns: 1,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Título del Comunicado',
                                        level: 1
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Fecha y lugar del comunicado'
                                    }
                                },
                                {
                                    id: 3,
                                    type: 'text',
                                    props: {
                                        content: 'Contenido principal del comunicado. Aquí va el cuerpo del texto con la información relevante...'
                                    }
                                },
                                {
                                    id: 4,
                                    type: 'heading',
                                    props: {
                                        text: 'Información de Contacto',
                                        level: 3
                                    }
                                },
                                {
                                    id: 5,
                                    type: 'text',
                                    props: {
                                        content: 'Para más información, contacte a...'
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            seo: {
                metaTitle: 'Comunicado - IIEG Jalisco',
                metaDescription: 'Comunicado oficial del Instituto de Información Estadística y Geográfica de Jalisco',
                metaKeywords: 'comunicado, oficial, IIEG, Jalisco',
                ogTitle: 'Comunicado - IIEG Jalisco',
                ogDescription: 'Comunicado oficial del Instituto de Información Estadística y Geográfica de Jalisco',
                ogImage: '',
                ogUrl: '',
                twitterCard: 'summary_large_image',
                twitterTitle: 'Comunicado - IIEG Jalisco',
                twitterDescription: 'Comunicado oficial del Instituto de Información Estadística y Geográfica de Jalisco',
                twitterImage: '',
                canonicalUrl: '',
                noIndex: false,
                noFollow: false
            }
        }
    },
    CONVOCATORIA: {
        id: 'convocatoria',
        name: 'Convocatoria',
        description: 'Formato para convocatorias y llamados públicos',
        icon: 'SoundOutlined',
        template: {
            sections: [
                {
                    id: 1,
                    columns: 1,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Convocatoria',
                                        level: 1
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'heading',
                                    props: {
                                        text: 'Bases de la Convocatoria',
                                        level: 2
                                    }
                                },
                                {
                                    id: 3,
                                    type: 'text',
                                    props: {
                                        content: '1. Requisitos\n2. Documentación\n3. Fechas importantes\n4. Proceso de selección'
                                    }
                                },
                                {
                                    id: 4,
                                    type: 'heading',
                                    props: {
                                        text: 'Fechas Importantes',
                                        level: 2
                                    }
                                },
                                {
                                    id: 5,
                                    type: 'text',
                                    props: {
                                        content: 'Publicación: [Fecha]\nCierre de registro: [Fecha]\nResultados: [Fecha]'
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            seo: {
                metaTitle: 'Convocatoria - IIEG Jalisco',
                metaDescription: 'Convocatoria del Instituto de Información Estadística y Geográfica de Jalisco',
                metaKeywords: 'convocatoria, registro, IIEG, Jalisco',
                ogTitle: 'Convocatoria - IIEG Jalisco',
                ogDescription: 'Convocatoria del Instituto de Información Estadística y Geográfica de Jalisco',
                ogImage: '',
                ogUrl: '',
                twitterCard: 'summary_large_image',
                twitterTitle: 'Convocatoria - IIEG Jalisco',
                twitterDescription: 'Convocatoria del Instituto de Información Estadística y Geográfica de Jalisco',
                twitterImage: '',
                canonicalUrl: '',
                noIndex: false,
                noFollow: false
            }
        }
    },
    INFORME: {
        id: 'informe',
        name: 'Informe/Reporte',
        description: 'Formato para informes y reportes técnicos',
        icon: 'FileTextOutlined',
        template: {
            sections: [
                {
                    id: 1,
                    columns: 1,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Título del Informe',
                                        level: 1
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Periodo: [Fecha inicial - Fecha final]'
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 2,
                    columns: 2,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Resumen Ejecutivo',
                                        level: 2
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Resumen de los puntos principales del informe...'
                                    }
                                }
                            ]
                        },
                        {
                            id: 2,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Datos Destacados',
                                        level: 2
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: '• Dato 1\n• Dato 2\n• Dato 3'
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 3,
                    columns: 1,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Conclusiones',
                                        level: 2
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Conclusiones y recomendaciones del informe...'
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            seo: {
                metaTitle: 'Informe - IIEG Jalisco',
                metaDescription: 'Informe del Instituto de Información Estadística y Geográfica de Jalisco',
                metaKeywords: 'informe, reporte, estadísticas, IIEG, Jalisco',
                ogTitle: 'Informe - IIEG Jalisco',
                ogDescription: 'Informe del Instituto de Información Estadística y Geográfica de Jalisco',
                ogImage: '',
                ogUrl: '',
                twitterCard: 'summary_large_image',
                twitterTitle: 'Informe - IIEG Jalisco',
                twitterDescription: 'Informe del Instituto de Información Estadística y Geográfica de Jalisco',
                twitterImage: '',
                canonicalUrl: '',
                noIndex: false,
                noFollow: false
            }
        }
    },
    LANDING: {
        id: 'landing',
        name: 'Página de Inicio/Landing',
        description: 'Página de presentación con hero y secciones destacadas',
        icon: 'RocketOutlined',
        template: {
            sections: [
                {
                    id: 1,
                    columns: 1,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Bienvenido al IIEG',
                                        level: 1
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Instituto de Información Estadística y Geográfica de Jalisco'
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 2,
                    columns: 3,
                    items: [
                        {
                            id: 1,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Estadística',
                                        level: 3
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Datos estadísticos actualizados de Jalisco'
                                    }
                                }
                            ]
                        },
                        {
                            id: 2,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Geografía',
                                        level: 3
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Información geográfica y cartográfica'
                                    }
                                }
                            ]
                        },
                        {
                            id: 3,
                            components: [
                                {
                                    id: 1,
                                    type: 'heading',
                                    props: {
                                        text: 'Datos Abiertos',
                                        level: 3
                                    }
                                },
                                {
                                    id: 2,
                                    type: 'text',
                                    props: {
                                        content: 'Acceso libre a información pública'
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            seo: {
                metaTitle: 'IIEG - Instituto de Información Estadística y Geográfica de Jalisco',
                metaDescription: 'Portal oficial del Instituto de Información Estadística y Geográfica de Jalisco. Accede a datos estadísticos, información geográfica y datos abiertos.',
                metaKeywords: 'IIEG, Jalisco, estadística, geografía, datos abiertos, información',
                ogTitle: 'IIEG - Instituto de Información Estadística y Geográfica de Jalisco',
                ogDescription: 'Portal oficial del Instituto de Información Estadística y Geográfica de Jalisco',
                ogImage: '',
                ogUrl: '',
                twitterCard: 'summary_large_image',
                twitterTitle: 'IIEG Jalisco',
                twitterDescription: 'Portal oficial del Instituto de Información Estadística y Geográfica de Jalisco',
                twitterImage: '',
                canonicalUrl: '',
                noIndex: false,
                noFollow: false
            }
        }
    }
};

export const TEMPLATE_LIST = Object.values(PAGE_TEMPLATES);
