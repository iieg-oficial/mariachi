export default function FeatureShowcaseComponent({
    title,
    description,
    features = [],
    ctaButtons = [],
    visualContent = {},
    statistics = [],
    layout = 'two-column'
}) {
    const isTwoColumn = layout === 'two-column';

    return (
        <div className="py-12">
            <div className={`${isTwoColumn ? 'grid md:grid-cols-2 gap-12 items-center' : 'max-w-4xl mx-auto text-center'}`}>
                <div className={isTwoColumn ? '' : 'mb-8'}>
                    {title && (
                        <h2 className="text-3xl font-bold mb-4 text-gray-900">{title}</h2>
                    )}
                    {description && (
                        <p className="text-lg text-gray-600 mb-6">{description}</p>
                    )}

                    {features.length > 0 && (
                        <div className="mb-6 space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {ctaButtons.length > 0 && (
                        <div className={`flex gap-4 mb-6 ${!isTwoColumn ? 'justify-center' : ''}`}>
                            {ctaButtons.map((btn, index) => (
                                <a
                                    key={index}
                                    href={btn.link}
                                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                        btn.type === 'primary'
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
                                    }`}
                                >
                                    {btn.text}
                                </a>
                            ))}
                        </div>
                    )}

                    {statistics.length > 0 && (
                        <div className={`grid grid-cols-${Math.min(statistics.length, 3)} gap-4 pt-6 border-t border-gray-200`}>
                            {statistics.map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{stat.value}</div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {visualContent?.type === 'image' && visualContent?.src && (
                    <div className={`${isTwoColumn ? '' : 'max-w-2xl mx-auto'}`}>
                        <img
                            src={visualContent.src}
                            alt={title}
                            className="w-full h-auto rounded-lg shadow-lg"
                        />
                    </div>
                )}

                {visualContent?.type === 'video' && visualContent?.src && (
                    <div className={`${isTwoColumn ? '' : 'max-w-2xl mx-auto'}`}>
                        <div className="relative pb-[56.25%] rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                src={visualContent.src}
                                className="absolute top-0 left-0 w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
