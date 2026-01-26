import { useState, useEffect } from 'react';
import { Typography, Tabs } from 'antd';
import api from '@services/api';
import HeaderLayoutForm from '@components/layouts/HeaderLayoutForm';
import FooterLayoutForm from '@components/layouts/FooterLayoutForm';

const { Title } = Typography;

export default function Layouts() {
    const [layouts, setLayouts] = useState(null);

    const fetchLayouts = async () => {
        try {
            const response = await api.get('/layouts');
            setLayouts(response.data);
        } catch (error) {
            console.error('Error fetching layouts:', error);
        }
    };

    useEffect(() => {
        fetchLayouts();
    }, []);

    const items = [
        {
            key: 'header',
            label: 'Header',
            children: (
                <HeaderLayoutForm
                    initialData={layouts?.header}
                    onSaved={fetchLayouts}
                />
            )
        },
        {
            key: 'footer',
            label: 'Footer',
            children: (
                <FooterLayoutForm
                    initialData={layouts?.footer}
                    onSaved={fetchLayouts}
                />
            )
        }
    ];

    return (
        <div>
            <Title level={2}>Edición de Layouts</Title>
            <Tabs defaultActiveKey="header" items={items} />
        </div>
    );
}
