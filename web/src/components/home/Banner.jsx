import { Link } from 'react-router'

function Banner({
    title = "Instituto de Información Estadística y Geográfica",
    subtitle = "Generamos, integramos y difundimos información estadística y geográfica de calidad para el desarrollo de Jalisco.",
    cta1Text = "Conoce más sobre el IIEG",
    cta1Link = "/conocenos",
    cta2Text = "Datos Abiertos",
    cta2Link = "/datos-abiertos"
}) {
    return (
        <section id="banner" className="relative bg-gradient-to-r from-purple-900 to-purple-700 py-20 scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="lg:w-1/2 text-white space-y-6">
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                            {title}
                        </h1>
                        <p className="text-lg lg:text-xl text-purple-100">
                            {subtitle}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            {cta1Text && (
                                <Link
                                    to={cta1Link}
                                    className="px-6 py-3 bg-white text-purple-900 font-semibold rounded-lg hover:bg-purple-50 transition-colors duration-200"
                                >
                                    {cta1Text}
                                </Link>
                            )}
                            {cta2Text && (
                                <Link
                                    to={cta2Link}
                                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition-colors duration-200"
                                >
                                    {cta2Text}
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="lg:w-1/2">
                        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                            <div className="aspect-video bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                                <svg className="w-32 h-32 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center text-white">
                        <div className="text-3xl font-bold">50+</div>
                        <div className="text-purple-200 text-sm mt-1">Sistemas de Información</div>
                    </div>
                    <div className="text-center text-white">
                        <div className="text-3xl font-bold">1000+</div>
                        <div className="text-purple-200 text-sm mt-1">Conjuntos de Datos</div>
                    </div>
                    <div className="text-center text-white">
                        <div className="text-3xl font-bold">100%</div>
                        <div className="text-purple-200 text-sm mt-1">Datos Abiertos</div>
                    </div>
                    <div className="text-center text-white">
                        <div className="text-3xl font-bold">24/7</div>
                        <div className="text-purple-200 text-sm mt-1">Acceso Disponible</div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Banner
