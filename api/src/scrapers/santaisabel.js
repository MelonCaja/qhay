const { buscarVTEX } = require('./vtex');
const buscarEnSantaIsabel = (query) => buscarVTEX('santaisabel', 'Santa Isabel', query);
module.exports = { buscarEnSantaIsabel };
