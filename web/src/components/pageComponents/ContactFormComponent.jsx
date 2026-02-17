import { useState } from 'react';

export default function ContactFormComponent({
    title,
    showContactInfo = true,
    contactInfo = {},
    showMap = true,
    mapEmbedUrl,
    formFields = [],
    submitText,
    submitEndpoint
}) {
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleFieldChange = (fieldName, value) => {
        setFormData({ ...formData, [fieldName]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch(submitEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Mensaje enviado correctamente');
                setFormData({});
            } else {
                alert('Error al enviar el mensaje');
            }
        } catch {
            alert('Error al enviar el mensaje');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    {showContactInfo && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">Información de Contacto</h3>
                            <div className="space-y-4">
                                {contactInfo?.address && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div>
                                            <p className="font-medium text-gray-900">Dirección</p>
                                            <p className="text-gray-600">{contactInfo.address}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.phone && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <div>
                                            <p className="font-medium text-gray-900">Teléfono</p>
                                            <p className="text-gray-600">{contactInfo.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.email && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <div>
                                            <p className="font-medium text-gray-900">Email</p>
                                            <p className="text-gray-600">{contactInfo.email}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.hours && (
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="font-medium text-gray-900">Horario</p>
                                            <p className="text-gray-600">{contactInfo.hours}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showMap && mapEmbedUrl && (
                        <div className="bg-gray-100 rounded-lg overflow-hidden h-64">
                            <iframe
                                src={mapEmbedUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Envíanos un mensaje</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {formFields.map((field, index) => (
                            <div key={index}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                    {field.required && <span className="text-red-500"> *</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        name={field.name}
                                        required={field.required}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        rows={4}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        required={field.required}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                )}
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                        >
                            {submitting ? 'Enviando...' : submitText || 'Enviar mensaje'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
