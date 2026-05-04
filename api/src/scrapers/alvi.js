const { buscarVTEX } = require('../vtex');
const buscarEnAlvi = (query) => buscarVTEX('alvi', 'Alvi', query);
module.exports = { buscarEnAlvi };