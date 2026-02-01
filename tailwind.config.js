/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        'bg-page': '#FFFFFF',
        'bg-surface': '#F4F4F5', // Zinc-100
        'bg-elevated': '#E4E4E7', // Zinc-200

        // Text
        'text-primary': '#18181B', // Zinc-900
        'text-secondary': '#71717A', // Zinc-500
        'text-tertiary': '#A1A1AA', // Zinc-400
        'text-muted': '#D4D4D8', // Zinc-300
        'text-on-accent': '#FFFFFF',

        // Accents
        'accent-aqua': '#22D3EE', // Primary Action
        'accent-teal': '#14B8A6', // Places
        'accent-blue': '#3B82F6', // Containers
        'accent-amber': '#F59E0B',
        'accent-orange': '#F97316',
        'accent-danger': '#EF4444', // Destructive

        // Borders
        'border-standard': '#D4D4D8',
      },
      fontFamily: {
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'button': '16px',
        'card': '20px',
        'input': '26px',
        'pill': '52px',
      },
      // Removed custom max-w-mobile to use standard max-w-md
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'floating': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
