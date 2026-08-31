import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InfoBoxLienzo from '@features/mapalab-layers/components/layersEditor/InfoBoxLienzo';

const CAMPOS = [
    { name: 'nombre', type: 'string' },
    { name: 'municipio', type: 'string' },
    { name: 'turno', type: 'string' },
];

const CONFIG = {
    headerField: 'nombre',
    labelGroups: [{ fields: ['municipio'], color: '#FF8300', bg: '#FFF2E5' }],
    list: [{ label: 'Turno', field: 'turno' }],
};

const montar = (config = CONFIG, onChange = vi.fn()) => {
    const vista = render(
        <InfoBoxLienzo value={config} onChange={onChange} availableFields={CAMPOS} />,
    );
    return { ...vista, onChange };
};

describe('InfoBoxLienzo', () => {
    it('dibuja la tarjeta con una sección por bloque', () => {
        montar();
        expect(screen.getByLabelText('Sección Etiquetas')).toBeInTheDocument();
        expect(screen.getByLabelText('Sección Lista')).toBeInTheDocument();
    });

    it('el título no tiene asa de arrastre', () => {
        montar();
        expect(screen.queryByLabelText('Mover Encabezado')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Mover Etiquetas')).toBeInTheDocument();
    });

    it('al tocar una sección aparece su editor en la canaleta', () => {
        montar();
        expect(screen.getByText(/Toca una sección/)).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Sección Lista'));
        expect(screen.queryByText(/Toca una sección/)).not.toBeInTheDocument();
        expect(screen.getByText('Agregar fila')).toBeInTheDocument();
    });

    it('quitar y duplicar solo aparecen en la sección seleccionada', () => {
        montar();
        expect(screen.queryByLabelText('Quitar Lista')).not.toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Sección Lista'));
        expect(screen.getByLabelText('Quitar Lista')).toBeInTheDocument();
        expect(screen.getByLabelText('Duplicar Lista')).toBeInTheDocument();
    });

    it('quitar una sección la saca de la configuración', () => {
        const onChange = vi.fn();
        montar(CONFIG, onChange);
        fireEvent.click(screen.getByLabelText('Sección Lista'));
        fireEvent.click(screen.getByLabelText('Quitar Lista'));
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls.at(-1)[0].list).toBeUndefined();
    });

    it('una sección sin datos sigue estando en la tarjeta', () => {
        montar({ headerField: 'nombre', list: [{ label: '', field: '' }] });
        expect(screen.getByText(/sin datos todavía/)).toBeInTheDocument();
    });

    it('siempre hay un botón para agregar sección', () => {
        montar();
        expect(screen.getAllByLabelText('Agregar sección').length).toBeGreaterThan(0);
    });

    it('con la tarjetita vacía invita a empezar', () => {
        montar({});
        expect(screen.getByText('Agrega una sección para empezar')).toBeInTheDocument();
    });

    it('sin título ofrece agregarlo', () => {
        const onChange = vi.fn();
        montar({ list: [{ label: 'Turno', field: 'turno' }] }, onChange);
        fireEvent.click(screen.getByText('Agregar título'));
        expect(onChange.mock.calls.at(-1)[0].headerField).toBe('');
    });

    it('con título ya no ofrece agregarlo', () => {
        montar();
        expect(screen.queryByText('Agregar título')).not.toBeInTheDocument();
    });

    it('ver cómo queda apaga las asas y los insertadores', () => {
        montar();
        expect(screen.getByLabelText('Mover Etiquetas')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Ver cómo queda'));
        expect(screen.queryByLabelText('Mover Etiquetas')).not.toBeInTheDocument();
        expect(screen.queryAllByLabelText('Agregar sección')).toHaveLength(0);
        expect(screen.getByText(/Así se pinta en el visor/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Volver a editar'));
        expect(screen.getByLabelText('Mover Etiquetas')).toBeInTheDocument();
    });
});
