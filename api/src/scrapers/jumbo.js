const { buscarVTEX } = require('../vtex');
const buscarEnJumbo = (query) => buscarVTEX('jumbo', 'Jumbo', query);
module.exports = { buscarEnJumbo };
