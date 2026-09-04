import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LayersTreeBranch from '@features/mapalab-layers/components/LayersTreeBranch';

const rama = (node, expanded = new Set()) => (
    <LayersTreeBranch
        node={node}
        depth={0}
        expanded={expanded}
        selectedKey={null}
        isMobile={false}
        toggleExpanded={vi.fn()}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
    />
);

describe('LayersTreeBranch', () => {
    it('muestra las capas de una etiqueta sin necesidad de expandirla', () => {
        render(rama({
            key: 'e1',
            title: 'Delitos contra el patrimonio',
            nodeType: 'label',
            children: [
                { key: 'g1', title: 'Robo a bancos', nodeType: 'group', parentNodeType: 'label', children: [] },
            ],
        }));

        expect(screen.getByText('Robo a bancos')).toBeInTheDocument();
    });

    it('anida etiquetas dentro de un grupo con sus capas visibles', () => {
        render(rama({
            key: 'g1',
            title: 'Establecimientos de salud',
            nodeType: 'group',
            children: [
                {
                    key: 'e1',
                    title: 'Primer nivel',
                    nodeType: 'label',
                    parentNodeType: 'group',
                    children: [
                        { key: 'c1', title: 'Casa de salud', nodeType: 'leaf', parentNodeType: 'label' },
                    ],
                },
            ],
        }));

        expect(screen.getByText('Primer nivel')).toBeInTheDocument();
        expect(screen.getByText('Casa de salud')).toBeInTheDocument();
    });

    it('marca el grupo que no tiene variantes propias', () => {
        render(rama({
            key: 'g1',
            title: 'Establecimientos de salud',
            nodeType: 'group',
            children: [{ key: 'e1', title: 'Primer nivel', nodeType: 'label', parentNodeType: 'group', children: [] }],
        }));

        expect(screen.getByText('grupo sin variantes')).toBeInTheDocument();
    });

    it('cuenta como variantes solo las capas hijas del grupo', () => {
        render(rama({
            key: 'g2',
            title: 'Robo a bancos',
            nodeType: 'group',
            children: [
                { key: 'c1', title: 'Total', nodeType: 'leaf', parentNodeType: 'group' },
                { key: 'c2', title: 'Tasa', nodeType: 'leaf', parentNodeType: 'group' },
            ],
        }));

        expect(screen.getByText('grupo · 2 variantes')).toBeInTheDocument();
    });
});
