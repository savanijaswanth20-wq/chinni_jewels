import { resolve } from 'path';

export default {
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        product: resolve(import.meta.dirname, 'product.html'),
        stock: resolve(import.meta.dirname, 'stock.html'),
        checkout: resolve(import.meta.dirname, 'checkout.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        success: resolve(import.meta.dirname, 'success.html'),
      },
    },
  },
};
