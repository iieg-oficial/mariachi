let messageApi = null;
let pending = [];

export const setMessageApi = (api) => {
    messageApi = api;
    if (pending.length) {
        pending.forEach((fn) => fn(api));
        pending = [];
    }
};

const dispatch = (method) => (...args) => {
    if (messageApi) return messageApi[method](...args);
    pending.push((api) => api[method](...args));
};

export const message = {
    success: dispatch('success'),
    error: dispatch('error'),
    warning: dispatch('warning'),
    info: dispatch('info'),
    loading: dispatch('loading'),
    open: dispatch('open'),
    destroy: dispatch('destroy'),
};
