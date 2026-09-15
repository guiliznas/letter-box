import path from 'path';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const root = __dirname;

// No modo mock, os serviços que falam com Firebase e Gmail são trocados por
// implementações locais, e o interceptador de IA é carregado antes do app.
const mockServices = (): Plugin => {
  const replacements: Record<string, string> = {
    [path.join(root, 'services/firebase.ts')]: path.join(root, 'mocks/firebase.ts'),
    [path.join(root, 'services/googleService.ts')]: path.join(root, 'mocks/googleService.ts'),
  };

  return {
    name: 'letterbox-mock-services',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && replacements[resolved.id]) return replacements[resolved.id];
      return null;
    },
    transformIndexHtml(html) {
      return html.replace(
        '<script type="module" src="/index.tsx"></script>',
        '<script type="module" src="/mocks/setup.ts"></script>\n    <script type="module" src="/index.tsx"></script>'
      );
    },
  };
};

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), ...(mode === 'mock' ? [mockServices()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(root, '.'),
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}));
