import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { getPageBySlug } from '@services/pageService';
import SectionRenderer from '@components/pageComponents/ComponentRenderer';

export default function DynamicPage() {
    const { '*': slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            setError(false);

            const fullSlug = slug || '';
            const data = await getPageBySlug(fullSlug);

            if (!data || data.id === 0) {
                setError(true);
            } else {
                setPage(data);
                if (data.metaDescription) {
                    document.querySelector('meta[name="description"]')?.setAttribute('content', data.metaDescription);
                }
                if (data.title) {
                    document.title = `${data.title} - IIEG`;
                }
            }

            setLoading(false);
        };

        loadPage();
    }, [slug]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Página no encontrada</h1>
                <p className="text-gray-600">La página que buscas no existe o aún no tiene contenido.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {page.title && (
                <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
            )}
            <SectionRenderer sections={page.sections} />
        </div>
    );
}
