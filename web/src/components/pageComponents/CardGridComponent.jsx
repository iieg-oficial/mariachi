const BADGE_COLORS = {
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
};

const GRID_COLS = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

export default function CardGridComponent({
    title,
    cards = [],
    columns = 3,
    showCta = true,
    ctaText,
    ctaLink
}) {
    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className={`grid ${GRID_COLS[columns]} gap-6 mb-8`}>
                {cards.map((card, index) => {
                    const colorScheme = BADGE_COLORS[card.badgeColor] || BADGE_COLORS.gray;

                    if (card.featured) {
                        return (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white hover:shadow-xl transition-shadow"
                            >
                                <div className="text-4xl mb-3">{card.icon}</div>
                                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                                <p className="mb-4 opacity-90">{card.description}</p>
                                {card.link && (
                                    <a
                                        href={card.link}
                                        className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                    >
                                        Ver más &rarr;
                                    </a>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={index}
                            className={`bg-white rounded-lg p-6 border-2 ${colorScheme.border} hover:shadow-lg transition-all`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-3xl">{card.icon}</div>
                                <span className={`px-3 py-1 ${colorScheme.bg} ${colorScheme.text} rounded-full text-xs font-medium`}>
                                    {card.badge}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-gray-900">{card.title}</h3>
                            <p className="text-gray-600 mb-4 text-sm">{card.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {card.date && new Date(card.date).toLocaleDateString('es-MX')}
                                </span>
                                {card.link && (
                                    <a href={card.link} className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                                        Ver más &rarr;
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCta && ctaText && ctaLink && (
                <div className="text-center">
                    <a
                        href={ctaLink}
                        className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                        {ctaText}
                    </a>
                </div>
            )}
        </div>
    );
}
