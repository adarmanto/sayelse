import '@testing-library/jest-dom/vitest';

// React 19 only exposes act() when it knows the code is under test. Without
// this, @testing-library/react resolves act from react-dom/test-utils, which
// no longer ships it in production builds.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement matchMedia, and the panel reads the colour scheme
// through it to resolve the theme.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

export {};
