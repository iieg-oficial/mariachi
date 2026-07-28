export const filenameFromHeaders = (headers, fallback) => {
    const disposition = headers?.['content-disposition'] || '';
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1] : fallback;
};

export const triggerDownload = (response, fallback) => {
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromHeaders(response.headers, fallback);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export default triggerDownload;
