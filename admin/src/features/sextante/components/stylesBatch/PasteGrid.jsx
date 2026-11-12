import { DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { TABLE_COLUMNS } from '@features/sextante/utils/stylesBatchTable';

const TITLES = {
    capa: 'Nombre',
    nombre_capa_geoserver: 'Capa GeoServer',
    campo: 'Campo',
    unidades: 'Unidades',
    paleta: 'Paleta',
    orientacion_favorable: 'Mejor',
    cortes_rangos: 'Cortes',
};

const WIDTHS = { capa: 2, nombre_capa_geoserver: 2, unidades: 2, paleta: 2, cortes_rangos: 2 };

const COLUMNS = TABLE_COLUMNS.map((column) => ({
    ...keyColumn(column, textColumn),
    title: TITLES[column],
    grow: WIDTHS[column] || 1,
    minWidth: 90,
}));

export default function PasteGrid({ value, onChange }) {
    return (
        <div aria-label="Tabla para pegar desde Excel">
            <DataSheetGrid
                value={value}
                onChange={onChange}
                columns={COLUMNS}
                createRow={() => ({})}
                height={320}
                addRowsComponent={false}
            />
        </div>
    );
}
