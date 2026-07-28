import { useState } from 'react';
import { labelOfField, tabOf } from '../components/visualEditor/fieldUtils';

export default function useFieldRelations({ fields, tabs, hasTabs, activeKey, setActiveTab }) {
    const [relacionActiva, setRelacionActiva] = useState(null);

    const labelOfName = (name) => labelOfField(fields.find((f) => f.name === name)) ?? name;

    const irACampo = (name) => {
        const destino = fields.findIndex((f) => f.name === name);
        if (destino < 0) return;

        const tabDestino = hasTabs ? tabOf(fields[destino], tabs) : null;
        if (tabDestino && tabDestino !== activeKey) setActiveTab(tabDestino);

        setRelacionActiva(fields[destino].showWhen?.field ?? name);
        requestAnimationFrame(() => {
            document.querySelector(`[data-field-name="${name}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    };

    return { relacionActiva, setRelacionActiva, labelOfName, irACampo };
}
