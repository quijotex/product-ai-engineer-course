import { createApp } from './src/app.js';
import { leerConfig } from './src/config.js';

const config = leerConfig();
const server = createApp({ config });

server.listen(config.port, '127.0.0.1', () => {
  console.log(`Consultorio en http://127.0.0.1:${config.port}`);
});
