/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          DEFAULT: "#030503",
          header: "#071007",
          panel: "rgba(2, 6, 2, 0.9)",
          dark: "#020c02",
        },
        phosphor: {
          DEFAULT: "#00ff41",
          dim: "#00801a",
          amber: "#ffb000",
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'cursor-blink': 'cursorBlink 0.9s steps(2, start) infinite',
        'pulse-green': 'pulseGreen 2s infinite ease-in-out',
        'pulse-amber': 'pulseAmber 2.5s infinite ease-in-out',
      },
      keyframes: {
        cursorBlink: {
          'to': { visibility: 'hidden' },
        },
        pulseGreen: {
          '0%, 100%': { opacity: '0.8', textShadow: '0 0 0px rgba(0,255,65,0)' },
          '50%': { opacity: '1', textShadow: '0 0 8px rgba(0, 255, 65, 0.45)' },
        },
        pulseAmber: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
