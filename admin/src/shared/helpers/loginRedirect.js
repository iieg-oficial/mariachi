export const buildLoginPath = (location) => {
    const next = `${location.pathname}${location.search}`;
    if (!next || next === '/' || next.startsWith('/login')) {
        return '/login';
    }
    return `/login?next=${encodeURIComponent(next)}`;
};

export const resolveNextPath = (rawNext) => {
    if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//') || rawNext.startsWith('/login')) {
        return '/';
    }
    return rawNext;
};
