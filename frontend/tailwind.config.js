/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#BDF7EB', // Agua Celestial / Verde Cristalino
                    50: '#F2FDFA',
                    100: '#E6FCF6',
                    200: '#BDF7EB',
                    300: '#8BEDDB',
                    400: '#5BE2CC',
                    500: '#2BD9BD',
                    600: '#22AD97',
                    700: '#1A8271',
                    800: '#11574B',
                    900: '#092B26',
                }
            }
        },
    },
    plugins: [],
}
