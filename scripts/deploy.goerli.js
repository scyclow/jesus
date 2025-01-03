async function main() {
  const [artist, collector1, collector2, collector3] = await ethers.getSigners()

  signers = await ethers.getSigners()
  cardinal = signers[0]
  priest1 = signers[1]
  priest2 = signers[2]
  disciple1 = signers[3]
  disciple2 = signers[4]
  disciple3 = signers[5]
  console.log('Deploying contracts for addr:', cardinal.address)

  console.log('Deploying MockERC1155')
  MockERC1155Factory = await ethers.getContractFactory('MockERC1155', cardinal)
  MockERC1155 = await MockERC1155Factory.deploy()
  await MockERC1155.deployed()

  console.log('Deploying Jesus')
  JesusFactory = await ethers.getContractFactory('SubwayJesusPamphlets', cardinal)
  Jesus = await JesusFactory.deploy(MockERC1155.address)
  await Jesus.deployed()

  JesusDAOFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphlets')
  JesusDAO = await JesusDAOFactory.attach(
    await Jesus.connect(cardinal).church()
  )


  console.log('Testing tokens...:')
  await MockERC1155.connect(cardinal).mint(cardinal.address, 1)
  await MockERC1155.connect(cardinal).safeTransferFrom(cardinal.address, Jesus.address, 1, 1, [])


  console.log(`Jesus:`, Jesus.address)
  console.log(`DAO:`, await Jesus.connect(cardinal).church())
}

// async function main() {
//   const [artist, collector1, collector2, collector3] = await ethers.getSigners()

//   signers = await ethers.getSigners()
//   cardinal = signers[0]
//   console.log('Deploying Metadata2Test')
//   Metadata2TestFactory = await ethers.getContractFactory('Metadata2Test', artist)
//   Metadata2Test = await Metadata2TestFactory.deploy()
//   await Metadata2Test.deployed()

//   console.log(`Metadata2Test:`, Metadata2Test.address)

// }


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });