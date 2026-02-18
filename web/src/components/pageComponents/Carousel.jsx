import { useState, useEffect, useCallback } from 'react'

export default function Carousel({ slides = [], autoplay = true, interval = 5000, className = '' }) {
    const [current, setCurrent] = useState(0)

    const next = useCallback(() => {
        setCurrent(prev => (prev + 1) % slides.length)
    }, [slides.length])

    useEffect(() => {
        if (!autoplay || slides.length <= 1) return
        const timer = setInterval(next, interval)
        return () => clearInterval(timer)
    }, [autoplay, interval, next])

    if (!slides || slides.length === 0) return null

    return (
        <div className={`relative w-full overflow-hidden min-h-[480px] md:min-h-[560px] ${className}`}>
            {slides.map((slide, i) => (
                <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    style={{
                        backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
                        backgroundColor: !slide.backgroundImage ? '#1e293b' : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative z-10 h-full flex items-center">
                        <div className="w-full max-w-6xl mx-auto px-6 py-16">
                            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                {slide.avatar && (
                                    <div className="flex-shrink-0">
                                        <img
                                            src={slide.avatar}
                                            alt=""
                                            className="w-36 h-36 md:w-52 md:h-52 rounded-full object-cover border-4 border-white shadow-xl"
                                        />
                                    </div>
                                )}

                                <div className={`flex flex-col text-white ${slide.avatar ? 'items-center md:items-start text-center md:text-left' : 'items-center text-center w-full'}`}>
                                    {slide.title && (
                                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight">
                                            {slide.title}
                                        </h2>
                                    )}
                                    {slide.description && (
                                        <p className="mt-4 text-base md:text-lg text-white/85 max-w-xl">
                                            {slide.description}
                                        </p>
                                    )}
                                    {slide.buttonText && slide.buttonLink && (
                                        <a
                                            href={slide.buttonLink}
                                            className="mt-6 inline-block bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            {slide.buttonText}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {slides.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            aria-label={`Ir al slide ${i + 1}`}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${i === current ? 'bg-black scale-110' : 'bg-white/60 hover:bg-white/80'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
