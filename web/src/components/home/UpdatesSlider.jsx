import { useState, useEffect } from 'react'
import { Link } from 'react-router'

function UpdatesSlider({
    title = "Actualizaciones Recientes",
    subtitle = "Mantente informado con las últimas novedades del IIEG",
    items
}) {
    const [currentSlide, setCurrentSlide] = useState(0)

    const defaultUpdates = [
        {
            title: 'Nuevo sistema de información estadística disponible',
            description: 'Consulta los últimos datos económicos y demográficos de Jalisco',
            date: '15 de octubre, 2025',
            image: '📊',
            link: '/sistemas',
            category: 'Sistemas'
        },
         
        {
            title: 'Actualización de datos abiertos mensuales',
            description: 'Descarga los conjuntos de datos más recientes en formato abierto',
            date: '10 de octubre, 2025',
            image: '📁',
            link: '/datos-abiertos',
            category: 'Datos Abiertos'
        }
    ];

    const updates = (items && items.length > 0) ? items : defaultUpdates;

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % updates.length)
        }, 5000)

        return () => clearInterval(timer)
    }, [updates.length])

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % updates.length)
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + updates.length) % updates.length)
    }

    const goToSlide = (index) => {
        setCurrentSlide(index)
    }

    return (
        <section id="slider" className="py-16 bg-gray-50 scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-gray-600">
                        {subtitle}
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto">
                    <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {updates.map((update, index) => (
                                <div key={update.id || index} className="w-full flex-shrink-0">
                                    <div className="flex flex-col md:flex-row items-center p-8 md:p-12 gap-8">
                                        <div className="text-8xl">{update.icon || update.image}</div>

                                        <div className="flex-1 text-center md:text-left">
                                            <span className="inline-block px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full mb-3">
                                                {update.category}
                                            </span>
                                            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                                                {update.title}
                                            </h3>
                                            <p className="text-gray-600 mb-4 text-lg">
                                                {update.description}
                                            </p>
                                            <p className="text-sm text-gray-500 mb-6">
                                                {update.date}
                                            </p>
                                            <Link
                                                to={update.link}
                                                className="inline-block px-6 py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors duration-200"
                                            >
                                                Leer más
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-colors duration-200"
                        aria-label="Anterior"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-colors duration-200"
                        aria-label="Siguiente"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <div className="flex justify-center gap-2 mt-6">
                        {updates.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                    ? 'w-8 bg-purple-700'
                                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                                    }`}
                                aria-label={`Ir a slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default UpdatesSlider
