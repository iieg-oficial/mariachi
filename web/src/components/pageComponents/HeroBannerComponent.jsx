export default function HeroBannerComponent({
    title,
    subtitle,
    backgroundGradient,
    ctaButtons = [],
    statistics = [],
    showStatistics
}) {
    return (
        <div className={`bg-gradient-to-r ${backgroundGradient} text-white py-16 px-6 rounded-lg`}>
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">{title}</h1>
                <p className="text-xl mb-8 opacity-90">{subtitle}</p>

                {ctaButtons.length > 0 && (
                    <div className="flex gap-4 mb-12">
                        {ctaButtons.map((btn, index) => (
                            <a
                                key={index}
                                href={btn.link}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                    btn.type === 'primary'
                                        ? 'bg-white text-purple-900 hover:bg-gray-100'
                                        : 'border-2 border-white text-white hover:bg-white hover:text-purple-900'
                                }`}
                            >
                                {btn.text}
                            </a>
                        ))}
                    </div>
                )}

                {showStatistics && statistics.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {statistics.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl font-bold">{stat.value}</div>
                                <div className="text-sm opacity-80">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
