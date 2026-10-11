import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const useHttps = process.argv.includes('--https') || process.env.HTTPS === 'true';

  return {
    plugins: useHttps ? [basicSsl()] : [],
    resolve: {
      alias: {
        'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      https: useHttps ? {} : false,
      watch: {
        ignored: ['**/models/**', '**/public/models/**', '**/bucket_elevator_master_app/**']
      }
    }
  };
});
