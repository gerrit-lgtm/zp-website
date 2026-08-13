/**
 * The ZeroPoint CI, expressed as the Tailwind theme.
 *
 * Every value below is verbatim from ZEROPOINT CI (Brand & Corporate Identity
 * Guide): palette from section 03 p.11, type scale from p.12, control and card
 * geometry from the component standards on p.25, grid and margins from p.26.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // the six named brand colours, used in the CI's fixed 60/20/10/8/6/6 ratio
        peacoat: '#192231', // primary background
        surf: '#1D3557', // secondary background — nav, side panels, elevated surfaces
        dazzling: '#2B579A', // highlight — key actions, links, active states
        stormy: '#5A6F8A', // supporting — icons, dividers, borders
        cool: '#75787B', // neutral — muted text, disabled
        bright: '#F4F4F0', // content and contrast

        // the extended dark ramp, sampled from the CI's own product renders,
        // which run deeper than Peacoat so a full-bleed key visual carries light
        void: '#060B14', // page + hero ground
        abyss: '#0A121C', // section band
        deep: '#0C141F', // card fill on dark
        slate: '#151C24', // elevated CTA band
      },
      fontFamily: {
        // Plus Jakarta Sans for headings and brand statements, Inter for body/UI
        display: ['"Plus Jakarta Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['Inter', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        control: '12px', // buttons, inputs, selects, chips
        card: '16px', // cards and panels
      },
      maxWidth: {
        content: '1168px', // desktop content width
      },
      letterSpacing: {
        eyebrow: '0.18em',
        wordmark: '0.32em',
      },
      transitionTimingFunction: {
        // fast start into a long settle — nothing bounces, nothing overshoots
        standard: 'cubic-bezier(.2,0,0,1)',
      },
      screens: {
        // the CI's own breakpoints: 4-col ≤767, 8-col 768–1439, 12-col 1440+
        zpTablet: '768px',
        zpDesktop: '1440px',
      },
    },
  },
  plugins: [],
};
