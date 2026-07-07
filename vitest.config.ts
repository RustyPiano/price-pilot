import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig.json 的 jsx 设为 "preserve" (交给 Next.js 的编译器处理), Vite 默认会
  // 沿用这一设置从而跳过 JSX 转换; 测试环境没有 Next 编译器兜底, 需显式声明自动转换。
  // Vite 8 默认用 oxc (而非 esbuild) 做转换, 故覆盖 oxc.jsx 而不是 esbuild.jsx。
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
