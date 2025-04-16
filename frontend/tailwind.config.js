/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soft-beige': '#F9F4EF',
        'warm-sand': '#EADBC8',
        'dusty-taupe': '#D3C2B4',
        'clay-brown': '#8C6F5E',
        'blush-pink': '#F4E3DA',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
