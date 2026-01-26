function BannerSitioActual() {
    return (
        <section id="sitio-actual" className="py-16 bg-gradient-to-r from-green-600 to-emerald-600 scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto text-center text-white">
                    <div className="mb-6">
                        <div className="inline-block bg-white bg-opacity-20 rounded-full p-4 mb-4">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                    </div>
                    
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                        ¿Buscas nuestro sitio anterior?
                    </h2>
                    <p className="text-xl text-green-50 mb-8 max-w-2xl mx-auto">
                        Accede a la versión anterior del portal IIEG con toda la información histórica 
                        y recursos que ya conoces.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="https://iieg.gob.mx/old"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 font-bold text-lg rounded-lg hover:bg-green-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            Ir al sitio anterior
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="inline-flex items-center gap-2 px-6 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-green-700 transition-all duration-200"
                        >
                            Explorar nuevo sitio
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-white border-opacity-30">
                        <p className="text-green-100 text-sm">
                            💡 Este nuevo portal está diseñado para brindarte una mejor experiencia de usuario, 
                            con navegación más intuitiva y acceso más rápido a la información.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default BannerSitioActual
