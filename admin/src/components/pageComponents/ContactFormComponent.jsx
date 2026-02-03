import { useState } from 'react';
import { Card, Input, Button, Space, Switch, Form as AntForm } from 'antd';
import { EnvironmentOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function ContactFormComponent({
    title,
    showContactInfo = true,
    contactInfo = {},
    showMap = true,
    mapEmbedUrl,
    formFields = [],
    submitText,
    submitEndpoint,
    editable,
    onChange
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
        } catch (error) {
            alert('Error al enviar el mensaje');
        } finally {
            setSubmitting(false);
        }
    };

    if (editable) {
        return (
            <Card title="Configuración Formulario de Contacto" size="small">
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                    <Input
                        placeholder="Título de la sección"
                        value={title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        size="large"
                    />

                    <Space wrap>
                        <Switch
                            checked={showContactInfo}
                            onChange={(checked) => onChange({ showContactInfo: checked })}
                        />
                        <span>Mostrar información de contacto</span>
                    </Space>

                    {showContactInfo && (
                        <Card size="small" title="Información de Contacto">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Input
                                    placeholder="Dirección"
                                    value={contactInfo?.address}
                                    onChange={(e) =>
                                        onChange({ contactInfo: { ...contactInfo, address: e.target.value } })
                                    }
                                />
                                <Input
                                    placeholder="Teléfono"
                                    value={contactInfo?.phone}
                                    onChange={(e) =>
                                        onChange({ contactInfo: { ...contactInfo, phone: e.target.value } })
                                    }
                                />
                                <Input
                                    placeholder="Email"
                                    value={contactInfo?.email}
                                    onChange={(e) =>
                                        onChange({ contactInfo: { ...contactInfo, email: e.target.value } })
                                    }
                                />
                                <Input
                                    placeholder="Horario"
                                    value={contactInfo?.hours}
                                    onChange={(e) =>
                                        onChange({ contactInfo: { ...contactInfo, hours: e.target.value } })
                                    }
                                />
                            </Space>
                        </Card>
                    )}

                    <Space wrap>
                        <Switch
                            checked={showMap}
                            onChange={(checked) => onChange({ showMap: checked })}
                        />
                        <span>Mostrar mapa</span>
                    </Space>

                    {showMap && (
                        <Input
                            placeholder="URL del mapa (Google Maps embed)"
                            value={mapEmbedUrl}
                            onChange={(e) => onChange({ mapEmbedUrl: e.target.value })}
                        />
                    )}

                    <Input
                        placeholder="Texto del botón de envío"
                        value={submitText}
                        onChange={(e) => onChange({ submitText: e.target.value })}
                    />

                    <Input
                        placeholder="Endpoint de envío (API URL)"
                        value={submitEndpoint}
                        onChange={(e) => onChange({ submitEndpoint: e.target.value })}
                    />
                </Space>
            </Card>
        );
    }

    return (
        <div className="py-12">
            {title && <h2 className="text-3xl font-bold mb-8 text-gray-900">{title}</h2>}

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    {showContactInfo && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">
                                Información de Contacto
                            </h3>
                            <div className="space-y-4">
                                {contactInfo?.address && (
                                    <div className="flex items-start gap-3">
                                        <EnvironmentOutlined className="text-purple-600 text-xl mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900">Dirección</p>
                                            <p className="text-gray-600">{contactInfo.address}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.phone && (
                                    <div className="flex items-start gap-3">
                                        <PhoneOutlined className="text-blue-600 text-xl mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900">Teléfono</p>
                                            <p className="text-gray-600">{contactInfo.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.email && (
                                    <div className="flex items-start gap-3">
                                        <MailOutlined className="text-green-600 text-xl mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900">Email</p>
                                            <p className="text-gray-600">{contactInfo.email}</p>
                                        </div>
                                    </div>
                                )}
                                {contactInfo?.hours && (
                                    <div className="flex items-start gap-3">
                                        <ClockCircleOutlined className="text-orange-600 text-xl mt-1" />
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
