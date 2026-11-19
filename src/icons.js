const lines = {
  sprout: '<path d="M12 22v-8m0 2c0-6 3-10 9-10 0 6-4 10-9 10Zm0 1C6 17 3 14 3 8c5 0 9 3 9 9Z"/>',
  heart: '<path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 20.5l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.9 2.9 0 1 1 4.1 2.6c-.9.5-1.3 1.2-1.3 2m0 3h.01"/>',
  sound: '<path d="M3 9v6h4l5 4V5L7 9H3Zm12 .2a4 4 0 0 1 0 5.6m2.8-8.4a8 8 0 0 1 0 11.2"/>',
  muted: '<path d="M3 9v6h4l5 4V5L7 9H3Zm13 1 5 5m0-5-5 5"/>',
  flower: '<path d="M12 7.2C9 1 3.5 6.8 7.4 10 1 10.9 3.4 18.2 8.7 15.7 7.6 22 16.4 22 15.3 15.7 20.6 18.2 23 10.9 16.6 10 20.5 6.8 15 1 12 7.2Z"/><circle cx="12" cy="12" r="1.8"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.7 8.3-2 5.4-5.4 2 2-5.4 5.4-2Z"/>',
  sparkles: '<path d="M10 3c0 5-2 7-7 7 5 0 7 2 7 7 0-5 2-7 7-7-5 0-7-2-7-7Zm9 10v6m-3-3h6M18 3v4m-2-2h4"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${lines[name]}</svg>`;
}

const eyes = '<circle cx="16" cy="23" r="1.45"/><circle cx="26" cy="23" r="1.45"/>';
const blush = '<ellipse cx="12.8" cy="26" rx="2.5" ry="1.4" fill="#ea93a0"/><ellipse cx="29.2" cy="26" rx="2.5" ry="1.4" fill="#ea93a0"/>';
const smile = '<path d="M18.5 26q2.5 3 5 0" fill="none" stroke="#50344a" stroke-width="1" stroke-linecap="round"/>';
const faces = {
  bunny: '<ellipse cx="15.3" cy="10.6" rx="4.5" ry="8.6" fill="#fff3ef" transform="rotate(-13 15 11)"/><ellipse cx="26.7" cy="10.6" rx="4.5" ry="8.6" fill="#fff3ef" transform="rotate(13 27 11)"/><ellipse cx="15.3" cy="10.5" rx="2" ry="5.7" fill="#eb9db6" transform="rotate(-13 15 11)"/><ellipse cx="26.7" cy="10.5" rx="2" ry="5.7" fill="#eb9db6" transform="rotate(13 27 11)"/><ellipse cx="21" cy="23.8" rx="13.1" ry="10.7" fill="#fff3ef"/>',
  bear: '<circle cx="10.6" cy="13.3" r="5" fill="#b77054"/><circle cx="31.4" cy="13.3" r="5" fill="#b77054"/><circle cx="10.6" cy="13.3" r="2.4" fill="#f3b58e"/><circle cx="31.4" cy="13.3" r="2.4" fill="#f3b58e"/><ellipse cx="21" cy="22.3" rx="13.5" ry="11.4" fill="#c98460"/><ellipse cx="21" cy="26.6" rx="6.4" ry="5" fill="#ffe3ae"/>',
  bird: '<path d="M21 11c0-5 2-8 8-7-1 5-3 7-8 9M20 12c-4-1-7-4-6-8 6 0 8 4 8 8" fill="#418d9e"/><ellipse cx="21" cy="22.9" rx="13.1" ry="10.8" fill="#6bbacf"/><ellipse cx="21" cy="26.4" rx="8.3" ry="6.4" fill="#e2f4e8"/>',
};

export const animalIcon = (name) => `<svg viewBox="0 0 42 38" fill="#50344a" aria-hidden="true">${faces[name]}${eyes}${blush}${name === 'bird' ? '<path d="m17.7 24.4 6.6 0-3.3 3.9Z" fill="#eea256"/>' : smile}</svg>`;
