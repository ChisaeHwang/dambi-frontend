/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        "primary-dark": "var(--primary-color-dark)",
        success: "var(--success-color)",
        danger: "var(--danger-color)",
        warning: "var(--warning-color)",
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-tertiary": "var(--bg-tertiary)",
        "bg-accent": "var(--bg-accent)",
        "text-normal": "var(--text-normal)",
        "text-muted": "var(--text-muted)",
        "text-link": "var(--text-link)",
        "text-positive": "var(--text-positive)",
        "text-warning": "var(--text-warning)",
        "text-danger": "var(--text-danger)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};
