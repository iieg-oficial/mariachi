const STATUS_STYLES = {
    active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Activa' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cerrada' },
    awarded: { bg: 'bg-green-100', text: 'text-green-800', label: 'Adjudicada' }
};

export default function ProcurementListComponent({
    title,
    items = [],
    externalLink,
    showGuide = true,
    guideSteps = []
}) {
    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-xl font-bold mb-4 text-gray-900">Licitaciones Recientes</h3>
                        <div className="space-y-4">
                            {items.map((item, index) => {
                                const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                                return (
                                    <div
                                        key={index}
                                        className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                            <span className={`px-3 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-full text-xs font-medium`}>
                                                {statusStyle.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">Número: {item.number}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(item.date).toLocaleDateString('es-MX')}
                                        </p>
                                        {item.link && (
                                            <a
                                                href={item.link}
                                                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                                            >
                                                Ver convocatoria &rarr;
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {externalLink?.url && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <a
                                    href={externalLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {externalLink.text || 'Ver más licitaciones'}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {showGuide && guideSteps.length > 0 && (
                    <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">
                            ¿Cómo participar?
                        </h3>
                        <ol className="space-y-3">
                            {guideSteps.map((step, index) => (
                                <li key={index} className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-700">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}
