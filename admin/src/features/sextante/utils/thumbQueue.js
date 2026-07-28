const MAX_CONCURRENT = 6;

let active = 0;
const pending = [];

const pump = () => {
    while (active < MAX_CONCURRENT && pending.length) {
        const start = pending.shift();
        active += 1;
        start();
    }
};

export const acquireThumbSlot = () => new Promise((resolve) => {
    pending.push(resolve);
    pump();
});

export const releaseThumbSlot = () => {
    active = Math.max(0, active - 1);
    pump();
};
