import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-body': '#040404',
        'bg-1': '#ebe8db',
        'bg-2': '#f5f0ea',
        'bg-3': '#d3bba8',
        'color-dark': '#2a2119',
        'color-tan': '#dfc9a6',
        'accent-3': '#9e763b',
        'accent-4': '#be9a56',
        'accent-1': '#0a1d39',
        'accent-2': '#0f2723',
      },
      fontFamily: {
        display: ['Raveo Display', 'Arial', 'sans-serif'],
        serif: ['LT Superior Serif', 'Arial', 'sans-serif'],
        sans: ['Instrument Sans', 'Arial', 'sans-serif'],
        mono: ['Geist Mono Variable', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
