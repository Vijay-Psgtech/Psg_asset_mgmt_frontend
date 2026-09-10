/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        panel: '#ffffff',
        panel2: '#f3f6fa',
        line: '#dce5ef',
        accent: '#1f6fb2',
        accent2: '#0b91c8',
        mint: '#159a84',
        muted: '#718096',
      },
      fontFamily: {
        display: ['"Space Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        hard: '0 4px 12px 0 rgba(23,32,51,0.12)',
      },
    },
  },
  plugins: [],
};
