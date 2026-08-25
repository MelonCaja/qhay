const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand/middleware resuelve por defecto a su build ESM (esm/middleware.mjs,
// vía el condition "import" del exports map de zustand), que usa
// `import.meta.env` crudo para detectar Vite. Metro no transforma
// `import.meta` al bundlear para web -> el bundle final (cargado como
// <script> clásico, no como módulo) revienta en el navegador con
// "Uncaught SyntaxError: import.meta may only appear in a module".
// Fix: apuntar directo al archivo CJS (zustand/middleware.js), que no usa
// import.meta, evitando el mecanismo de "exports" por completo — probado
// contra el bundle real (grep "import.meta" en el output) hasta llegar a 0
// coincidencias. Si en el futuro aparece el mismo error con otro paquete,
// diagnostica igual: buildear, grepear el bundle de dist/_expo/static/js/web/
// por "import.meta", y ubicar cuál .mjs lo trae.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'node_modules/zustand/middleware.js'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
