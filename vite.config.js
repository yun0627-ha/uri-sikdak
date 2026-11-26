import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync } from 'node:fs';

// 앱 설치용 PNG 아이콘 (app-icons/*.b64 에 글자로 저장해 두고, 빌드할 때 그림 파일로 풀어요)
const appIcons = () => ({
  name: 'app-icons',
  generateBundle() {
    for (const f of readdirSync('./app-icons').filter(n => n.endsWith('.b64'))) {
      this.emitFile({ type: 'asset', fileName: f.slice(0, -4), source: Buffer.from(readFileSync(`./app-icons/${f}`, 'utf8').trim(), 'base64') });
    }
  },
});

export default defineConfig({ plugins: [react(), appIcons()] });
