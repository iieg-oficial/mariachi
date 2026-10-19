import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form } from 'antd';
import AccesoMinervaSection from '../components/AccesoMinervaSection';
import EnlaceAccesoModal from '../components/EnlaceAccesoModal';
import { rolesDirectos } from '../hooks/useAccesoMinerva';

const persona = {
    minerva_id: 'm-1',
    roles: [
        { id: 'r-1', slug: 'editor', name: 'Editor', via: 'direct' },
        { id: 'r-2', slug: 'captura', name: 'Capturistas', via: 'group' },
    ],
};

const conForm = (ui) => render(<Form>{ui}</Form>);

describe('rolesDirectos', () => {
    it('ignora los roles heredados de un grupo', () => {
        expect(rolesDirectos(persona)).toEqual(['r-1']);
    });

    it('sin persona no hay roles', () => {
        expect(rolesDirectos(null)).toEqual([]);
    });
});

describe('AccesoMinervaSection', () => {
    it('muestra los roles heredados como bloqueados', () => {
        conForm(<AccesoMinervaSection roles={[]} persona={persona} cargando={false} esPropio={false} />);
        expect(screen.getByText('Capturistas')).toBeInTheDocument();
        expect(screen.getByText('por grupo')).toBeInTheDocument();
    });

    it('sin herencia no pinta la fila de grupo', () => {
        conForm(<AccesoMinervaSection roles={[]} persona={null} cargando={false} esPropio={false} />);
        expect(screen.queryByText('por grupo')).toBeNull();
    });

    it('en la ficha propia avisa que los roles los cambia otra persona', () => {
        conForm(<AccesoMinervaSection roles={[]} persona={null} cargando={false} esPropio />);
        expect(screen.getByText('Tus roles los cambia otra persona')).toBeInTheDocument();
    });
});

describe('EnlaceAccesoModal', () => {
    it('muestra el enlace y su propósito', () => {
        render(
            <EnlaceAccesoModal
                enlace={{ url: 'https://minerva.test/activar#token=abc', purpose: 'invite', expires_at: '2026-10-26T00:00:00Z' }}
                onClose={() => {}}
            />,
        );
        expect(screen.getByDisplayValue('https://minerva.test/activar#token=abc')).toBeInTheDocument();
        expect(screen.getByText(/Invitación/)).toBeInTheDocument();
    });
});
