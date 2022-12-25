const fs = require('fs')



const str = fs.readFileSync('./docs/pamphletData.js', {encoding:'utf8'}).replace('const pamphletData = ', '')
const data = JSON.parse(str)


data.forEach(d => {
  d.image = `ipfs://bafybeihcypukbriaakry5zhk4bpa3huscpe5ywfqrasavi43c2l3aweofa/${d.token_id}.jpg`
  fs.writeFileSync(`./docs/metadata/${d.token_id}.json`, JSON.stringify(d, null, 2))
})