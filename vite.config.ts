import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Copy script to output directory
const copyScripts = () => {
  return {
    name: 'copy-scripts',
    closeBundle() {
      const scriptsDir = join(process.cwd(), 'scripts');
      const destDir = join(process.cwd(), 'dist', 'scripts');
      
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      
      try {
        copyFileSync(
          join(scriptsDir, 'yubikey-sign.sh'), 
          join(destDir, 'yubikey-sign.sh')
        );
        console.log('Successfully copied YubiKey scripts to output directory');
      } catch (err) {
        console.error('Error copying scripts:', err);
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), copyScripts()],
  base: './',
  css: {
    postcss: './postcss.config.cjs'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
