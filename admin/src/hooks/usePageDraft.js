import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '@services/api';
import { BLOCK_CONFIG } from '@constants/pageConstants';

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

            if (pageData.sections && pageData.sections.length > 0 && pageData.sections[0].columns) {
                console.warn('Detected old nested structure. Resetting to flat blocks.');
                pageData.sections = [];
            }

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
            metaDescription: ''
        }
    });

    const addBlock = (blockType) => {
        const config = BLOCK_CONFIG[blockType];
        if (!config) return;

        const newBlock = {
            id: `temp-block-${nextTempId}`,
            type: blockType,
            props: JSON.parse(JSON.stringify(config.defaultProps))
        };

        setNextTempId(prev => prev + 1);
        setPage(prev => ({
            ...prev,
            sections: [...prev.sections, newBlock]
        }));
    };

    const removeBlock = (blockId) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.filter(b => b.id !== blockId)
        }));
    };

    const updateBlock = (blockId, newProps) => {
        setPage(prev => ({
            ...prev,
            sections: prev.sections.map(b =>
                b.id === blockId ? { ...b, props: { ...b.props, ...newProps } } : b
            )
        }));
    };

    const moveBlock = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === page.sections.length - 1) return;

        setPage(prev => {
            const newBlocks = [...prev.sections];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
            return { ...prev, sections: newBlocks };
        });
    };

    const duplicateBlock = (index) => {
        setPage(prev => {
            const blockToCopy = prev.sections[index];
            const newBlock = {
                ...JSON.parse(JSON.stringify(blockToCopy)),
                id: `temp-block-${nextTempId}`
            };
            const newBlocks = [...prev.sections];
            newBlocks.splice(index + 1, 0, newBlock);
            return { ...prev, sections: newBlocks };
        });
        setNextTempId(prev => prev + 1);
        message.success('Bloque duplicado');
    };

    const updateSEO = (seoData) => {
        setPage(prev => ({
            ...prev,
            seo: { ...prev.seo, ...seoData }
        }));
    };

    const updatePageStructure = (newSections) => {
        setPage(prev => ({
            ...prev,
            sections: newSections
        }));
    };

    const discardChanges = () => {
        setPage(JSON.parse(JSON.stringify(originalPage)));
        message.success('Cambios descartados');
    };

    const publishChanges = async () => {
        setPublishing(true);
        try {
            const pageToPublish = {
                ...page,
                sections: page.sections.map(block => ({
                    ...block,
                    id: block.id.startsWith('temp-') ? undefined : block.id
                }))
            };

            await api.put(`/pages/${pageId}`, pageToPublish);

            setOriginalPage(JSON.parse(JSON.stringify(page)));

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

    return {
        page,
        loading,
        publishing,
        hasChanges,
        addBlock,
        removeBlock,
        updateBlock,
        moveBlock,
        duplicateBlock,
        updateSEO,
        updatePageStructure,
        discardChanges,
        publishChanges
    };
};
