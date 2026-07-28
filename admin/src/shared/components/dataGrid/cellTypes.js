import { checkboxColumn, keyColumn, textColumn } from 'react-datasheet-grid';
import SelectCell from '@shared/components/dataGrid/cells/SelectCell';

const selectColumn = (options) => ({
    component: SelectCell,
    columnData: { options },
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => {
        const match = options.find(
            (option) => String(option.value).toLowerCase() === String(value).trim().toLowerCase(),
        );
        return match ? match.value : (String(value).trim() || null);
    },
});

const baseColumnFor = (meta, catalogs) => {
    if (meta.type === 'bool') return checkboxColumn;
    if (meta.type === 'select') return selectColumn(catalogs?.[meta.optionsKey] || []);
    return textColumn;
};

export const buildGridColumns = ({
    columnsMeta,
    catalogs,
    draft,
    rowKeyField,
    conflictKeys,
    isCellDisabled,
}) => columnsMeta
    .filter((meta) => !meta.sticky)
    .map((meta) => ({
        ...keyColumn(meta.key, baseColumnFor(meta, catalogs)),
        title: meta.title,
        minWidth: meta.width || 160,
        basis: meta.width || 160,
        grow: 0,
        disabled: ({ rowData }) => {
            if (meta.editable === false) return true;
            return isCellDisabled ? isCellDisabled(rowData, meta) : false;
        },
        cellClassName: ({ rowData }) => {
            const rowKey = rowData?.[rowKeyField];
            const cellId = `${rowKey}::${meta.key}`;
            if (conflictKeys?.has(cellId)) return 'grid-cell-conflict';
            if (draft?.[rowKey] && Object.prototype.hasOwnProperty.call(draft[rowKey], meta.key)) {
                return 'grid-cell-dirty';
            }
            return undefined;
        },
    }));

