import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 讀取環境變數，使用 process.cwd() 確保路徑正確
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // 1. 設定基礎路徑：必須與你的 GitHub 倉庫名稱完全一致，前後都要有斜線
    base: '/KEELUNG-PARKING-PCM/',
    
    plugins: [react()],
    
    resolve: {
      alias: {
        // 2. 設定 @ 指向專案根目錄，方便程式碼中引用
        '@': path.resolve(__dirname, './'),
      },
    },
    
    define: {
      // 3. 處理環境變數，讓程式碼中可以使用 process.env
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    server: {
      port: 3000,
      host: true, // 允許透過 IP 存取
    },

    build: {
      // 確保打包輸出的資料夾名稱為 dist
      outDir: 'dist',
      // 確保靜態資源資產目錄結構正確
      assetsDir: 'assets',
    }
  };
});
