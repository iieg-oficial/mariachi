import { svg } from 'lit';

const stroke = (paths) => svg`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        ${paths}
    </svg>
`;

export const ICONS = {
    bug: stroke(svg`
        <path d="M16 7h.01" />
        <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
        <path d="m20 7 2 .5-2 .5" />
        <path d="M10 18v3" />
        <path d="M14 17.75V21" />
        <path d="M7 18a6 6 0 0 0 3.84-10.61" />
    `),
    chat: stroke(svg`
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    `),
    feedback: stroke(svg`
        <path d="M14 9V5a3 3 0 0 0-6 0v4" />
        <rect x="2" y="9" width="20" height="12" rx="2" ry="2" />
    `),
    help: stroke(svg`
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
    `),
    flag: stroke(svg`
        <path d="M4 22V4a2 2 0 0 1 2-2h11l-2 5 2 5H6" />
        <line x1="4" y1="22" x2="4" y2="15" />
    `),
    close: stroke(svg`
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    `),
    camera: stroke(svg`
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    `),
    send: stroke(svg`
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    `),
    check: stroke(svg`
        <polyline points="20 6 9 17 4 12" />
    `),
    tooltip: svg`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="10" fill="#FFDAB2" />
            <path transform="translate(6.65 17.879)" fill="#FF8300" d="M2.167-7.474v.407H4.09v-.209c0-.352.231-.6.747-.835a1.87,1.87,0,0,0,1.242-1.78c0-1.363-1.11-2.264-2.8-2.264S.5-11.232.442-9.726H2.376a.748.748,0,0,1,.857-.791c.516,0,.813.22.813.615,0,.33-.2.549-.725.758A1.53,1.53,0,0,0,2.167-7.474ZM1.958-5.3A1.123,1.123,0,0,0,3.134-4.155,1.123,1.123,0,0,0,4.31-5.3,1.123,1.123,0,0,0,3.134-6.441,1.123,1.123,0,0,0,1.958-5.3Z" />
        </svg>
    `,
    error: svg`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" aria-hidden="true">
            <path fill="#EA4335" fill-rule="evenodd" d="M1.248,7.073A5.825,5.825,0,1,0,7.073,1.248,5.825,5.825,0,0,0,1.248,7.073M7.073,0a7.073,7.073,0,1,0,7.073,7.073A7.074,7.074,0,0,0,7.073,0M6.449,4.161a.624.624,0,1,1,1.248,0V7.906a.624.624,0,1,1-1.248,0Zm.624,5.2a.624.624,0,1,0,.624.624.624.624,0,0,0-.624-.624" />
        </svg>
    `,
    upload: svg`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 94" aria-hidden="true">
            <circle cx="47" cy="47" r="47" fill="#FBF2FF" />
            <g transform="translate(22.452 20.088)" fill="#6E2F86" stroke="#6F2F87" stroke-width="1">
                <path transform="translate(6.726 7.263)" d="M34.2,10.587,27.191,2.081A5.572,5.572,0,0,0,22.9,0H5.736A5.544,5.544,0,0,0,1.684,1.819,6.469,6.469,0,0,0,0,6.195V32.3a6.47,6.47,0,0,0,1.684,4.376A5.546,5.546,0,0,0,5.736,38.5H29.91a5.545,5.545,0,0,0,4.052-1.819A6.471,6.471,0,0,0,35.646,32.3V14.713A6.529,6.529,0,0,0,34.2,10.587ZM33.83,32.3h0A4.42,4.42,0,0,1,32.683,35.3a3.786,3.786,0,0,1-2.773,1.24H5.737A4.088,4.088,0,0,1,1.815,32.3V6.2A4.088,4.088,0,0,1,5.737,1.961H22.9a3.778,3.778,0,0,1,2.929,1.419l7.007,8.506a4.425,4.425,0,0,1,.992,2.827Z" />
                <path transform="translate(-11.329 -9.804)" d="M36.483,30.312a.853.853,0,0,0-1.114,0l-4.834,4.175h0a.977.977,0,0,0-.382.658,1.023,1.023,0,0,0,.192.75.9.9,0,0,0,.606.363.854.854,0,0,0,.664-.208l3.341-2.912V45.458a.9.9,0,1,0,1.8,0V33.141L40.1,36.052l0,0a.854.854,0,0,0,.664.208.894.894,0,0,0,.6-.364,1.012,1.012,0,0,0,.2-.716.983.983,0,0,0-.335-.656Z" />
                <path transform="translate(-11.382 -4.707)" d="M31.132,23.076H40.8a.941.941,0,0,0,.9-.974.951.951,0,0,0-.9-.986H31.132a.951.951,0,0,0-.9.986.941.941,0,0,0,.9.974" />
            </g>
        </svg>
    `,
    success: svg`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55.423 38.373" aria-hidden="true">
            <path transform="translate(4.243 4.243)" d="M0,15.324l15.807,15.806L46.938,0" fill="none" stroke="#4CAA56" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" />
        </svg>
    `,
    sectionError: svg`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 94" aria-hidden="true">
            <circle cx="47" cy="47" r="47" fill="rgba(234,67,53,0.12)" />
            <path transform="translate(47 19.183) rotate(45)" fill="#EA4335" stroke="#EA4334" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.67,0a2.127,2.127,0,0,0-2.126,2.126V17.543H2.126a2.126,2.126,0,1,0,0,4.253H17.543V37.213a2.126,2.126,0,1,0,4.253,0V21.8H37.213a2.126,2.126,0,1,0,0-4.253H21.8V2.126A2.127,2.127,0,0,0,19.67,0" />
        </svg>
    `,
};
