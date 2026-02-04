/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds (consolidated from globals.css @theme)
        'bg-page': '#F8F9FA', // Soft off-white
        'bg-surface': '#FFFFFF', // Pure white for cards
        'bg-surface-alt': '#FAFAFA', // Very subtle grey
        'bg-elevated': '#FFFFFF', // Pure white for modals/popovers
        'bg-subtle': '#F4F4F5', // Zoning/Groups background

        // Text
        'text-primary': '#18181B', // Zinc 900
        'text-secondary': '#71717A', // Zinc 500
        'text-tertiary': '#A1A1AA', // Zinc 400
        'text-muted': '#D4D4D8', // Zinc 300
        'text-on-accent': '#FFFFFF',

        // Borders
        'border-light': '#E4E4E7', // Zinc 200
        'border-standard': '#E4E4E7', // Zinc 200
        'border-active': '#A1A1AA', // Zinc 400

        // Accents
        'accent-aqua': '#0EA5E9', // Sky 500
        'accent-aqua-light': '#E0F2FE', // Sky 100
        'accent-aqua-dark': '#0284C7', // Sky 600
        'accent-teal': '#14B8A6', // Places
        'accent-blue': '#3B82F6', // Blue 500 - Containers
        'accent-amber': '#F59E0B',
        'accent-orange': '#F97316',
        'accent-danger': '#EF4444', // Red 500
        'accent-danger-bg': '#FEF2F2', // Red 50
        'accent-success': '#10B981', // Emerald 500
        'accent-warning': '#F59E0B', // Amber 500
      },
      fontFamily: {
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'button': '0.75rem', // 12px (from @theme)
        'card': '1rem', // 16px (from @theme)
        'input': '0.75rem', // 12px (from @theme)
        'pill': '52px', // Keep existing
        'full': '9999px', // From @theme
      },
      // Removed custom max-w-mobile to use standard max-w-md
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.02), 0 2px 4px -2px rgb(0 0 0 / 0.02)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'floating': '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        'glow': '0 0 15px rgba(14, 165, 233, 0.25)',
      },
      padding: {
        'safe-area': 'env(safe-area-inset-bottom)',
        'safe-area-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
}
