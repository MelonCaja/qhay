const { buscarVTEX } = require('../vtex');
// Walmart Chile usa la cuenta VTEX "walmartcl" para Lider
const buscarEnLider = (query) => buscarVTEX('walmartcl', 'Lider', query);
module.exports = { buscarEnLider };
