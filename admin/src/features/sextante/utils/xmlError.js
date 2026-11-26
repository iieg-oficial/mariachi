export const xmlError = (xml) => {
    const doc = new DOMParser().parseFromString(xml || '', 'application/xml');
    const error = doc.querySelector('parsererror');
    return error ? error.textContent.trim().split('\n')[0] : null;
};
