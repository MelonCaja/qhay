const { buscarVTEX } = require('../vtex');
const buscarEnUnimarc = (query) => buscarVTEX('unimarc', 'Unimarc', query);
module.exports = { buscarEnUnimarc };
