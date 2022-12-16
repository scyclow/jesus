const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')

const toETH = amt => ethers.utils.parseEther(String(amt))
const bidAmount = amt => ({ value: toETH(amt) })
const num = n => Number(ethers.utils.formatEther(n))


let signers, cardinal, priest1, priest2, disciple1, disciple2, disciple3
let Jesus, JesusFactory, JesusDAOFactory, JesusDAO, MockERC1155, MockERC1155Factory

describe('ChurchOfSubwayJesusPamphlets', () => {
  beforeEach(async () => {
    signers = await ethers.getSigners()
    cardinal = signers[0]
    priest1 = signers[1]
    priest2 = signers[2]
    disciple1 = signers[3]
    disciple2 = signers[4]
    disciple3 = signers[5]

    MockERC1155Factory = await ethers.getContractFactory('MockERC1155', cardinal)
    MockERC1155 = await MockERC1155Factory.deploy()
    await MockERC1155.deployed()

    JesusFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphlets', cardinal)
    Jesus = await JesusFactory.deploy(MockERC1155.address)
    await Jesus.deployed()

    JesusDAOFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphletsDAO')
    JesusDAO = await JesusDAOFactory.attach(
      await Jesus.connect(cardinal).church()
    )

  })

  describe('constructor', () => {
    it('should mint #0 to me, and 1 - 76 to 0x0', async () => {})
    it('should set me as the royalty recipient', async () => {})
    it('should set the church address', async () => {})
  })

  describe('onERC1155Received', () => {
    it.only('should only work for correct tokens', async () => {

      await MockERC1155.connect(cardinal).mint(cardinal.address, 1)
      await MockERC1155.connect(cardinal).safeTransferFrom(cardinal.address, Jesus.address, 1, 1, [])
    })
    it('should transfer the correct new token from 0x0 to the caller', async () => {})
    it('should forward the OS token to the church', async () => {})
  })

  describe('onERC1155BatchReceived', () => {
    it('should only work for correct tokens', async () => {})
    it('should transfer the correct new token from 0x0 to the caller', async () => {})
    it('should forward the OS token to the church', async () => {})
  })

  describe('batchMint', () => {
    it('should only be callable by the church', async () => {})
    it('should transfer the correct tokens to the correct recipients', async () => {})
  })

  describe('transferChurch', () => {
    it('should only be callable by the church', async () => {})
    it('should should set the new church', async () => {})

  })

  describe('totalSupply', () => {
    it('should work after construction', async () => {})
    it('should work after redeems', async () => {})
    it('should work after redeems + batchMint', async () => {})
  })

  describe('setMetadataContract', () => {
    it('should only be callable by the church', async () => {})
    it('should set the metadata contract', async () => {})
  })

  describe('setRoyaltyInfo', () => {
    it('should only be callable by the church', async () => {})
    it('should set the royalty info', async () => {})
  })
})

describe('ChurchOfSubwayJesusPamphletsDAO', () => {
  // describe('hashing/making proposals')
  // describe('voting on proposals')
  // describe('voting with signatures')
  // describe('delegating votes')
  // describe('elect cardinal')
  // describe('cardinal execute')

})


    // it('should', async () => {})
    // it('should', async () => {})
    // it('should', async () => {})




