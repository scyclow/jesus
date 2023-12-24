const fs = require('fs')
const newData = require('../newData')



const str = fs.readFileSync('./docs/pamphletData.js', {encoding:'utf8'}).replace('const pamphletData = ', '')
const data = JSON.parse(str).concat(newData)
fs.writeFileSync(`./docs/pamphletData.js`, 'const pamphletData = ' + JSON.stringify(data, null, 2))
