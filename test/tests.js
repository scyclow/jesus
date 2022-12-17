const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')
const osTokenData = require('../osDataParsed.json')

const toETH = amt => ethers.utils.parseEther(String(amt))
const num = n => Number(ethers.utils.formatEther(n))

const encodeWithSignature = (functionName, argTypes, params) => {
  const iface = new ethers.utils.Interface([`function ${functionName}(${argTypes.join(',')})`])
  return iface.encodeFunctionData(functionName, params)
}

function times(t, fn) {
  const out = []
  for (let i = 0; i < t; i++) out.push(fn(i))
  return out
}


let signers, cardinal, priest1, priest2, disciple1, disciple2, disciple3
let Jesus, JesusFactory, JesusDAOFactory, JesusDAO, Metadata, MetadataFactory, MockERC1155, MockERC1155Factory

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

    MetadataFactory = await ethers.getContractFactory('Metadata')
    Metadata = await MetadataFactory.attach(
      await Jesus.connect(cardinal).metadataContract()
    )

  })

  describe('constructor', () => {
    it('should mint #0 to me, and 1 - 75 to 0x666', async () => {
      expect(await Jesus.connect(cardinal).ownerOf(0)).to.equal(cardinal.address)

      for (let i = 1; i < 76; i++) {
        expect(await Jesus.connect(cardinal).ownerOf(i)).to.equal('0x6666666666666666666666666666666666666666')
      }
      expect(await Jesus.connect(cardinal).totalSupply()).to.equal(76)
    })

    it('should set me as the royalty recipient', async () => {
      const royaltyInfo = await Jesus.connect(cardinal).royaltyInfo(0, 100)

      expect(royaltyInfo[0]).to.equal(cardinal.address)
      expect(royaltyInfo[1].toNumber()).to.equal(10)
    })

    it('should set the OS address', async () => {
      expect(await Jesus.connect(cardinal).purgatory()).to.equal(MockERC1155.address)

    })
  })

  describe('onERC1155Received', () => {
    it('should work for SJP tokens', async () => {
      await Promise.all(osTokenData.map(async d => {
        const { os_token_id } = d
        await MockERC1155.connect(cardinal).mint(disciple1.address, os_token_id)
        await MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, os_token_id, 1, [])
      }))

      expect(await Jesus.connect(cardinal).balanceOf(disciple1.address)).to.equal(75)

      for (let id = 1; id <= 75; id++) {
        expect(await Jesus.connect(cardinal).ownerOf(id)).to.equal(disciple1.address)
      }

      // should forward old tokens to DAO
      await Promise.all(osTokenData.map(async d => {
        expect(await MockERC1155.connect(cardinal).balanceOf(JesusDAO.address, d.os_token_id)).to.equal(1)
      }))
    })

    it('should revert for non-SJP tokens on purgatory contract', async () => {
      const incorrectTokens = [
        '56149969866452300878143827841099029158054578672514359653557300808794916257793', // flyer1
        '56149969866452300878143827841099029158054578672514359653557300807695404630017', // flyer2
        '56149969866452300878143827841099029158054578672514359653557300857173427879937', // seeing$
        '56149969866452300878143827841099029158054578672514359653557300854974404624385', // vista
        '32150014705918146096138927293761864425970273519802704166038767670271735234561', // wineVoucher
      ]

      await Promise.all(incorrectTokens.map(async id => {
        await MockERC1155.connect(cardinal).mint(disciple1.address, id)
        await expectRevert(
          MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, id, 1, []),
          'Not Subway Jesus Pamphlet token'
        )
      }))
    })

    it('should revert if non-1 amount is transferred', async () => {
      const tokenId = osTokenData[0].os_token_id

      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await expectRevert(
        MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 2, []),
        'Must absolve a single token'
      )
    })

    it('should revert if 0 amount is transferred', async () => {
      const tokenId = osTokenData[0].os_token_id

      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await expectRevert(
        MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 0, []),
        'Must absolve a single token'
      )
    })

    it('should revert when transferred correct id on wrong contract', async () => {
      const FakeMockERC1155 = await MockERC1155Factory.deploy()
      await FakeMockERC1155.deployed()

      const tokenId = osTokenData[0].os_token_id

      await FakeMockERC1155.connect(cardinal).mint(disciple1.address, tokenId)

      await expectRevert(
        FakeMockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 1, []),
        'Cannot absolve sins without purgatory'
      )
    })

    it('should revert if token has already been saved', async () => {
      const tokenId = osTokenData[0].os_token_id
      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 1, [])

      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)

      await expectRevert(
        MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 1, []),
        'ERC721: transfer of token that is not own'
      )
    })
  })

  describe('onERC1155BatchReceived', () => {
    it('should work for SJP tokens', async () => {
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))

      await MockERC1155.connect(disciple1).safeBatchTransferFrom(
        disciple1.address,
        Jesus.address,
        osTokenData.map(d => d.os_token_id),
        osTokenData.map(d => 1),
        []
      )

      expect(await Jesus.connect(cardinal).balanceOf(disciple1.address)).to.equal(75)

      for (let id = 1; id <= 75; id++) {
        expect(await Jesus.connect(cardinal).ownerOf(id)).to.equal(disciple1.address)
      }

      // should forward old tokens to DAO
      await Promise.all(osTokenData.map(async d => {
        expect(await MockERC1155.connect(cardinal).balanceOf(JesusDAO.address, d.os_token_id)).to.equal(1)
      }))
    })

    it('should revert for non-SJP tokens on purgatory contract', async () => {
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))

      const nonSJP = '56149969866452300878143827841099029158054578672514359653557300808794916257793' // flyer1
      await MockERC1155.connect(cardinal).mint(disciple1.address, nonSJP)

      const ids = osTokenData.map(d => d.os_token_id)
      ids[25] = nonSJP

      await expectRevert(
        MockERC1155.connect(disciple1).safeBatchTransferFrom(
          disciple1.address,
          Jesus.address,
          ids,
          osTokenData.map(d => 1),
          []
        ),
        'Not Subway Jesus Pamphlet token'
      )
    })


    it('should revert if non-1 amount is transferred', async () => {
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))
      await MockERC1155.connect(cardinal).mint(disciple1.address, osTokenData[1].os_token_id)
      const amounts = osTokenData.map(() => 1)
      amounts[1] = 2

      await expectRevert(
        MockERC1155.connect(disciple1).safeBatchTransferFrom(
          disciple1.address,
          Jesus.address,
          osTokenData.map(d => d.os_token_id),
          amounts,
          []
        ),
        'Must absolve a single token'
      )

    })

    it('should revert if 0 amount is transferred', async () => {
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))
      const amounts = osTokenData.map(() => 1)
      amounts[1] = 0

      await expectRevert(
        MockERC1155.connect(disciple1).safeBatchTransferFrom(
          disciple1.address,
          Jesus.address,
          osTokenData.map(d => d.os_token_id),
          amounts,
          []
        ),
        'Must absolve a single token'
      )
    })

    it('should revert when transferred correct id on wrong contract', async () => {
      const FakeMockERC1155 = await MockERC1155Factory.deploy()
      await FakeMockERC1155.deployed()

      await Promise.all(osTokenData.map(async d => FakeMockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))


      await expectRevert(
        FakeMockERC1155.connect(disciple1).safeBatchTransferFrom(
          disciple1.address,
          Jesus.address,
          osTokenData.map(d => d.os_token_id),
          osTokenData.map(() => 1),
          []
        ),
        'Cannot absolve sins without purgatory'
      )
    })

    it('should revert if token has already been saved', async () => {
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))

      await MockERC1155.connect(disciple1).safeBatchTransferFrom(
        disciple1.address,
        Jesus.address,
        osTokenData.map(d => d.os_token_id),
        osTokenData.map(d => 1),
        []
      )
      await Promise.all(osTokenData.map(async d => MockERC1155.connect(cardinal).mint(disciple1.address, d.os_token_id)))

      await expectRevert(
        MockERC1155.connect(disciple1).safeBatchTransferFrom(
          disciple1.address,
          Jesus.address,
          osTokenData.map(d => d.os_token_id),
          osTokenData.map(d => 1),
          []
        ),
        'ERC721: transfer of token that is not own'
      )
    })
  })

  describe('batchMint', () => {
    it('should revert if not called by the church', async () => {
      await expectRevert(
        Jesus.connect(cardinal).mintBatch([disciple1.address]),
        'Caller is not the church'
      )
    })

    it('should transfer the correct tokens to the correct recipients', async () => {
      const mintBatchCalldata = encodeWithSignature('mintBatch', ['address[]'], [[
        disciple1.address,
        disciple2.address,
        disciple3.address,
        JesusDAO.address,
        JesusDAO.address,
        JesusDAO.address,
      ]])

      await JesusDAO.connect(cardinal).cardinalExecute(Jesus.address, 0, mintBatchCalldata)

      expect(await Jesus.connect(cardinal).totalSupply()).to.equal(82)
      expect(await Jesus.connect(cardinal).ownerOf(76)).to.equal(disciple1.address)
      expect(await Jesus.connect(cardinal).ownerOf(77)).to.equal(disciple2.address)
      expect(await Jesus.connect(cardinal).ownerOf(78)).to.equal(disciple3.address)
      expect(await Jesus.connect(cardinal).ownerOf(79)).to.equal(JesusDAO.address)
      expect(await Jesus.connect(cardinal).ownerOf(80)).to.equal(JesusDAO.address)
      expect(await Jesus.connect(cardinal).ownerOf(81)).to.equal(JesusDAO.address)
    })
  })

  describe('transferChurch', () => {
    it('should revert if not called by the church', async () => {
      await expectRevert(
        Jesus.connect(cardinal).transferChurch(cardinal.address),
        'Caller is not the church'
      )
      expect(await Jesus.connect(cardinal).church()).to.equal(JesusDAO.address)
    })

    it('should should set the new church', async () => {
      const transferChurchCalldata = encodeWithSignature('transferChurch', ['address'], [cardinal.address])
      await JesusDAO.connect(cardinal).cardinalExecute(Jesus.address, 0, transferChurchCalldata)

      expect(await Jesus.connect(cardinal).church()).to.equal(cardinal.address)
    })
  })



  describe('setMetadataContract', () => {
    it('should revert if not called by the church', async () => {
      await expectRevert(
        Jesus.connect(cardinal).setMetadataContract(cardinal.address),
        'Caller is not the church'
      )
      expect(await Jesus.connect(cardinal).metadataContract()).to.equal(Metadata.address)
    })

    it('should set the metadata contract', async () => {
      const NewMetata = await MetadataFactory.deploy()
      await NewMetata.deployed()

      const setMetadataContractCalldata = encodeWithSignature('setMetadataContract', ['address'], [NewMetata.address])
      await JesusDAO.connect(cardinal).cardinalExecute(Jesus.address, 0, setMetadataContractCalldata)

      expect(await Jesus.connect(cardinal).metadataContract()).to.equal(NewMetata.address)
    })
  })

  describe('setRoyaltyInfo', () => {
    it('should revert if not called by the church', async () => {
      await expectRevert(
        Jesus.connect(cardinal).setRoyaltyInfo(priest1.address, 1500),
        'Caller is not the church'
      )
    })

    it('should set the royalty info', async () => {
      const setRoyaltyInfoCalldata = encodeWithSignature('setRoyaltyInfo', ['address', 'uint16'], [priest1.address, 1500])
      await JesusDAO.connect(cardinal).cardinalExecute(Jesus.address, 0, setRoyaltyInfoCalldata)

      const updatedRoyaltyInfo = await Jesus.connect(cardinal).royaltyInfo(0, 100)
      expect(updatedRoyaltyInfo[0]).to.equal(priest1.address)
      expect(updatedRoyaltyInfo[1].toNumber()).to.equal(15)
    })

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




