import { Link } from 'react-router'

function MapaLab() {
    return (
        <section id="mapalab" className="py-16 bg-white scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
                                🗺️ MapaLab
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
                                Laboratorio de Datos Geoespaciales
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                Explora mapas interactivos, visualiza datos territoriales y analiza 
                                información geográfica de Jalisco con nuestras herramientas especializadas.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-700">Mapas interactivos de Jalisco y sus municipios</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-700">Capas de información demográfica y socioeconómica</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-700">Herramientas de análisis espacial avanzado</span>
                                </li>
                            </ul>
                            <div className="flex flex-wrap gap-4 pt-4">
                                <Link 
                                    to="/sistemas/mapalab"
                                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                >
                                    Explorar MapaLab
                                </Link>
                                <Link 
                                    to="/sistemas/laboratorio-datos"
                                    className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors duration-200"
                                >
                                    Laboratorio de Datos
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 shadow-lg">
                                <div className="aspect-square bg-white rounded-xl shadow-inner flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-green-50">
                                        <svg className="w-full h-full opacity-30" viewBox="0 0 200 200">
                                            <path
                                                d="M50,50 L60,70 L50,90 L70,100 L90,90 L100,70 L90,50 L70,40 Z"
                                                fill="#3b82f6"
                                                stroke="#1e40af"
                                                strokeWidth="2"
                                            />
                                            <path
                                                d="M110,60 L130,65 L140,80 L135,100 L120,105 L105,95 L100,75 Z"
                                                fill="#60a5fa"
                                                stroke="#1e40af"
                                                strokeWidth="2"
                                            />
                                            <path
                                                d="M50,110 L70,115 L75,130 L65,145 L45,140 L40,125 Z"
                                                fill="#93c5fd"
                                                stroke="#1e40af"
                                                strokeWidth="2"
                                            />
                                        </svg>
                                    </div>
                                    <div className="relative z-10 text-center">
                                        <svg className="w-24 h-24 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-blue-700 font-semibold">Jalisco</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between text-sm text-gray-600">
                                    <span>125 Municipios</span>
                                    <span>78,588 km²</span>
                                    <span>8.3M habitantes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default MapaLab
