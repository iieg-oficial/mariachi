export const filenameFromHeaders = (headers, fallback) => {
    const disposition = headers?.['content-disposition'] || '';
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1] : fallback;
};

const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const triggerDownload = (response, fallback) => {
    saveBlob(response.data, filenameFromHeaders(response.headers, fallback));
};

const csvCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /["\r\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (headers, body, filename) => {
    const lines = [headers, ...body].map((row) => row.map(csvCell).join(','));
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8;' });
    saveBlob(blob, filename);
};
