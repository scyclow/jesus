const fs = require('fs')
// const newData = require('../newData')



const str = fs.readFileSync('./docs/pamphletData.js', {encoding:'utf8'}).replace('const pamphletData = ', '')
const data = JSON.parse(str)

console.log(JSON.parse(str).length)
// console.log(JSON.parse(str)[124])
// console.log(newData.length)
console.log(data.length)


data.forEach(d => {
  d.image = `ipfs://QmVzZeYrKjjKL65G6NJt1qQR5cvE8wyJDo283CkiYCbzva/${d.token_id}.jpg`
  fs.writeFileSync(`./docs/metadata/${d.token_id}.json`, JSON.stringify(d, null, 2))
})