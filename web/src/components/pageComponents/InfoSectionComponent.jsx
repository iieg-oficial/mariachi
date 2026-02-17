export default function InfoSectionComponent({
    title,
    cards = [],
    layout = 'grid'
}) {
    const gridClass = layout === 'grid' ? 'grid md:grid-cols-2 gap-6' : 'space-y-6';

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className={gridClass}>
                {cards.map((card, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 p-6 hover:shadow-lg transition-all"
                    >
                        <h3 className="text-xl font-bold mb-3 text-gray-900">{card.title}</h3>
                        {card.description && (
                            <p className="text-gray-600 mb-4">{card.description}</p>
                        )}

                        {card.features && card.features.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {card.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {card.links && card.links.length > 0 && (
                            <div className="space-y-2">
                                {card.links.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        className="block text-purple-600 hover:text-purple-700 hover:underline"
                                    >
                                        {link.text} &rarr;
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
