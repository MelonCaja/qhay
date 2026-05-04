const { buscarVTEX } = require('../vtex');
// M10 es parte del holding SMU, acepta BAES en varios locales
const buscarEnM10 = (query) => buscarVTEX('m10', 'Mayorista 10', query);
module.exports = { buscarEnM10 };