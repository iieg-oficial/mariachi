import { useEffect, useState } from 'react'
import { getPageBySlug } from '@services/pageService'
import BlockRenderer from '@components/BlockRenderer'

import Banner from '@components/home/Banner'
import UpdatesSlider from '@components/home/UpdatesSlider'
import MapaLab from '@components/home/MapaLab'
import RecentInfo from '@components/home/RecentInfo'
import SistemasInfo from '@components/home/SistemasInfo'
import Transparencia from '@components/home/Transparencia'
import Licitaciones from '@components/home/Licitaciones'
import ContabilidadGubernamental from '@components/home/ContabilidadGubernamental'
import BannerSitioActual from '@components/home/BannerSitioActual'
import Contacto from '@components/home/Contacto'

function HomePage() {
    const [page, setPage] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
         
        getPageBySlug('home')
            .then(data => {
                if (data && data.sections && data.sections.length > 0) {
                    setPage(data)
                }
            })
            .catch(err => {
                console.error("Failed to load home page config, falling back to static", err)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
            </div>
        )
    }

     
    if (page && page.sections.length > 0) {
        return (
            <div className="min-h-screen">
                {page.sections.map((block, index) => (
                    <BlockRenderer key={block.id || index} block={block} />
                ))}
            </div>
        )
    }

     
    return (
        <div className="min-h-screen">
            <Banner />
            <UpdatesSlider />
            <MapaLab />
            <RecentInfo />
            <SistemasInfo />
            <Transparencia />
            <Licitaciones />
            <ContabilidadGubernamental />
            <BannerSitioActual />
            <Contacto />
        </div>
    )
}

export default HomePage

