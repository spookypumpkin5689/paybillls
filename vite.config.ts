import { defineConfig } from 'vite'
import react from '@vitejs/react-refresh' // или то, что у тебя используется

export default defineConfig({
  base: '/paybillls/', // <-- ОБЯЗАТЕЛЬНО ДОБАВЬ ЭТУ СТРОКУ (с косыми чертами по бокам)
  plugins: [react()],
})
