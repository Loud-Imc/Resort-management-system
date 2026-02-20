/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f1f8fa',
                    100: '#e3f1f4',
                    200: '#c1dee4',
                    300: '#95c2ce',
                    400: '#62a1b1',
                    500: '#227c8a',
                    600: '#1b6672',
                    700: '#15535d',
                    800: '#0f3f47',
                    900: '#093f4a',
                },
            },
        },
    },
    plugins: [],
}
