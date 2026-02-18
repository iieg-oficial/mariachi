import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { getPageBySlug, getPreviewPage } from '@services/pageService'
import BlockRenderer from '@components/BlockRenderer'

export default function DynamicPage() {
    const { '*': slug } = useParams()
    const [searchParams] = useSearchParams()
    const previewToken = searchParams.get('preview')
    const [page, setPage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true)
            setError(false)

            const data = previewToken
                ? await getPreviewPage(previewToken)
                : await getPageBySlug(slug || '')

            if (!data || data.id === 0) {
                setError(true)
            } else {
                setPage(data)
                if (data.metaDescription) {
                    document.querySelector('meta[name="description"]')?.setAttribute('content', data.metaDescription)
                }
                if (data.title) {
                    document.title = `${data.title} - IIEG`
                }
            }

            setLoading(false)
        }

        loadPage()
    }, [slug, previewToken])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Página no encontrada</h1>
                <p className="text-gray-600">La página que buscas no existe o aún no tiene contenido.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            {previewToken && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#faad14', color: '#000', textAlign: 'center', padding: '8px 16px', fontWeight: 600, fontSize: 14 }}>
                    Modo vista previa — este contenido no está publicado
                </div>
            )}
            <div style={previewToken ? { paddingTop: 37 } : undefined}>
                {(page.sections || []).map((block, index) => (
                    <BlockRenderer key={block.id || index} block={block} />
                ))}
            </div>
        </div>
    )
}
