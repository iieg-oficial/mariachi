import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '@services/api';

export const usePageDraft = (pageId) => {
    const [originalPage, setOriginalPage] = useState(null);
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [nextTempId, setNextTempId] = useState(1);

    const hasChanges = JSON.stringify(originalPage) !== JSON.stringify(page);

    useEffect(() => {
        if (pageId) {
            loadPage();
        }
    }, [pageId]);

    const loadPage = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/pages/${pageId}`);
            const pageData = response.data || createEmptyPage();
            setOriginalPage(JSON.parse(JSON.stringify(pageData)));
            setPage(JSON.parse(JSON.stringify(pageData)));
        } catch (error) {
            console.error('Error loading page:', error);
            const emptyPage = createEmptyPage();
            setOriginalPage(emptyPage);
            setPage(emptyPage);
        } finally {
            setLoading(false);
        }
    };

    const createEmptyPage = () => ({
        id: pageId,
        menuItemId: pageId,
        title: '',
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
    });

    const addSection = (columns = 1) => {
        const newSection = {
            id: `temp-section-${nextTempId}`,
            columns: columns,
            items: Array(columns).fill(null).map((_, index) => ({
                id: `temp-item-${nextTempId}-${index}`,
                components: []
            }))
        };

        setNextTempId(prev => prev + 1);
        setPage(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
        message.success('Sección agregada');
    };

    const removeSection = (sectionId) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== sectionId)
        }));
        message.success('Sección eliminada');
    };

    const updateSection = (sectionId, updates) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, ...updates } : section
            )
        }));
    };

    const moveSectionUp = (sectionIndex) => {
        if (sectionIndex === 0) return;
        setPage(prev => {
            const newSections = [...prev.sections];
            [newSections[sectionIndex - 1], newSections[sectionIndex]] =
            [newSections[sectionIndex], newSections[sectionIndex - 1]];
            return { ...prev, sections: newSections };
        });
    };

    const moveSectionDown = (sectionIndex) => {
        if (sectionIndex === page.sections.length - 1) return;
        setPage(prev => {
            const newSections = [...prev.sections];
            [newSections[sectionIndex], newSections[sectionIndex + 1]] =
            [newSections[sectionIndex + 1], newSections[sectionIndex]];
            return { ...prev, sections: newSections };
        });
    };

    const addComponent = (sectionId, itemIndex, component) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id !== sectionId) return section;

                const newItems = [...section.items];
                newItems[itemIndex] = {
                    ...newItems[itemIndex],
                    components: [
                        ...newItems[itemIndex].components,
                        {
                            id: `temp-comp-${nextTempId}`,
                            type: component.type,
                            props: { ...component.defaultProps }
                        }
                    ]
                };

                return { ...section, items: newItems };
            })
        }));

        setNextTempId(prev => prev + 1);
        message.success(`${component.label} agregado`);
    };

    const removeComponent = (sectionId, itemIndex, componentId) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id !== sectionId) return section;

                const newItems = [...section.items];
                newItems[itemIndex] = {
                    ...newItems[itemIndex],
                    components: newItems[itemIndex].components.filter(c => c.id !== componentId)
                };

                return { ...section, items: newItems };
            })
        }));
        message.success('Componente eliminado');
    };

    const updateComponent = (sectionId, itemIndex, componentId, props) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id !== sectionId) return section;

                const newItems = [...section.items];
                newItems[itemIndex] = {
                    ...newItems[itemIndex],
                    components: newItems[itemIndex].components.map(comp =>
                        comp.id === componentId ? { ...comp, props: { ...comp.props, ...props } } : comp
                    )
                };

                return { ...section, items: newItems };
            })
        }));
    };

    const moveComponentUp = (sectionId, itemIndex, componentIndex) => {
        if (componentIndex === 0) return;

        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id !== sectionId) return section;

                const newItems = [...section.items];
                const components = [...newItems[itemIndex].components];
                [components[componentIndex - 1], components[componentIndex]] =
                [components[componentIndex], components[componentIndex - 1]];
                newItems[itemIndex] = { ...newItems[itemIndex], components };

                return { ...section, items: newItems };
            })
        }));
    };

    const moveComponentDown = (sectionId, itemIndex, componentIndex) => {
        setPage(prev => {
            const section = prev.sections.find(s => s.id === sectionId);
            if (!section) return prev;

            const components = section.items[itemIndex].components;
            if (componentIndex === components.length - 1) return prev;

            return {
                ...prev,
                sections: prev.sections.map(s => {
                    if (s.id !== sectionId) return s;

                    const newItems = [...s.items];
                    const comps = [...newItems[itemIndex].components];
                    [comps[componentIndex], comps[componentIndex + 1]] =
                    [comps[componentIndex + 1], comps[componentIndex]];
                    newItems[itemIndex] = { ...newItems[itemIndex], components: comps };

                    return { ...s, items: newItems };
                })
            };
        });
    };

    const updateSEO = (seoData) => {
        setPage(prev => ({
            ...prev,
            seo: { ...prev.seo, ...seoData }
        }));
    };

    const discardChanges = () => {
        setPage(JSON.parse(JSON.stringify(originalPage)));
        message.success('Cambios descartados');
    };

    const publishChanges = async () => {
        setPublishing(true);
        try {
            const pageToPublish = replaceTemporaryIds(page);

            await api.put(`/pages/${pageId}`, pageToPublish);

            setOriginalPage(JSON.parse(JSON.stringify(pageToPublish)));
            setPage(JSON.parse(JSON.stringify(pageToPublish)));

            message.success('Página publicada exitosamente');
            return true;
        } catch (error) {
            console.error('Error publishing page:', error);
            message.error('Error al publicar la página');
            return false;
        } finally {
            setPublishing(false);
        }
    };

    const replaceTemporaryIds = (pageData) => {
        let idCounter = 1;
        const idMap = {};

        const getNewId = (oldId) => {
            if (!oldId.toString().startsWith('temp-')) return oldId;
            if (!idMap[oldId]) {
                idMap[oldId] = idCounter++;
            }
            return idMap[oldId];
        };

        return {
            ...pageData,
            sections: pageData.sections.map(section => ({
                ...section,
                id: getNewId(section.id),
                items: section.items.map(item => ({
                    ...item,
                    id: getNewId(item.id),
                    components: item.components.map(comp => ({
                        ...comp,
                        id: getNewId(comp.id)
                    }))
                }))
            }))
        };
    };

    const applyTemplate = (template) => {
        if (!template) return;

        setPage(prev => ({
            ...prev,
            sections: template.sections || [],
            seo: {
                ...prev.seo,
                ...template.seo
            }
        }));

        message.success('Plantilla aplicada exitosamente');
    };

    return {
        page,
        originalPage,
        loading,
        publishing,
        hasChanges,
        addSection,
        removeSection,
        updateSection,
        moveSectionUp,
        moveSectionDown,
        addComponent,
        removeComponent,
        updateComponent,
        moveComponentUp,
        moveComponentDown,
        updateSEO,
        discardChanges,
        publishChanges,
        applyTemplate
    };
};
