import { useState, useEffect } from 'react';

export default function CarouselComponent({
    slides = [],
    autoplay = true,
    interval = 5000,
    showDots = true,
    showArrows = true
}) {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (!autoplay || slides.length === 0) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, interval);

        return () => clearInterval(timer);
    }, [autoplay, interval, slides.length]);

    if (slides.length === 0) {
        return (
            <div className="bg-gray-100 p-12 text-center rounded-lg">
                <p className="text-gray-500">No hay slides configurados</p>
            </div>
        );
    }

    const slide = slides[currentSlide];

    const goToSlide = (index) => setCurrentSlide(index);
    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    return (
        <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-12 min-h-[300px] flex flex-col justify-center">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="text-6xl mb-4">{slide.icon}</div>
                    <div className="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                        {slide.category}
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-gray-900">{slide.title}</h3>
                    <p className="text-lg text-gray-600 mb-6">{slide.description}</p>
                    <div className="text-sm text-gray-500 mb-4">
                        {new Date(slide.date).toLocaleDateString('es-MX')}
                    </div>
                    {slide.link && (
                        <a
                            href={slide.link}
                            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                            Ver más
                        </a>
                    )}
                </div>
            </div>

            {showArrows && slides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {showDots && slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-3 h-3 rounded-full transition-all ${
                                index === currentSlide
                                    ? 'bg-purple-600 w-8'
                                    : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
