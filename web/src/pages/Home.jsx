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

