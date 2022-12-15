const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')

const toETH = amt => ethers.utils.parseEther(String(amt))
const bidAmount = amt => ({ value: toETH(amt) })
const num = n => Number(ethers.utils.formatEther(n))


let signers, cardinal, priest1, priest2, disciple1, disciple2, disciple3
let Jesus, JesusFactory

describe('ChurchOfSubwayJesusPamphlets', () => {
  beforeEach(async () => {
    signers = await ethers.getSigners()
    cardinal = signers[0]
    priest1 = signers[1]
    priest2 = signers[2]
    disciple1 = signers[3]
    disciple2 = signers[4]
    disciple3 = signers[5]

    JesusFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphlets', cardinal)
    Jesus = await JesusFactory.deploy()
    await Jesus.deployed()

  JesusDAOFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphletsDAO')
  JesusDAO = await JesusDAOFactory.attach(
    await Jesus.connect(cardinal).church()
  )
  })

  it('should compile', async () => {
    console.log(await Jesus.connect(cardinal).church())
  })
})