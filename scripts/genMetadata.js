const fs = require('fs')
// const newData = require('../newData')



const str = fs.readFileSync('./docs/pamphletData.js', {encoding:'utf8'}).replace('const pamphletData = ', '')
const data = JSON.parse(str)

console.log(JSON.parse(str).length)
// console.log(JSON.parse(str)[124])
// console.log(newData.length)
console.log(data.length)


data.forEach(d => {
  d.image = `ipfs://QmTkz7vhnMQr2jj1yXMA272fZY3LgfKj7aBAPdgBsYjnTL/${d.token_id}.jpg`
  fs.writeFileSync(`./docs/metadata/${d.token_id}.json`, JSON.stringify(d, null, 2))
})