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

const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'


let signers, cardinal, priest1, priest2, disciple1, disciple2, disciple3
let Jesus, JesusFactory, JesusDAOFactory, JesusDAO, Metadata, MetadataFactory, MockERC1155, MockERC1155Factory

async function setup () {
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

  JesusFactory = await ethers.getContractFactory('SubwayJesusPamphlets', cardinal)
  Jesus = await JesusFactory.deploy(MockERC1155.address)
  await Jesus.deployed()

  JesusDAOFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphlets')
  JesusDAO = await JesusDAOFactory.attach(
    await Jesus.connect(cardinal).church()
  )

  MetadataFactory = await ethers.getContractFactory('Metadata')
  Metadata = await MetadataFactory.attach(
    await Jesus.connect(cardinal).metadataContract()
  )
}

let OSOpenStorefront
async function mainnetForkSetup() {
  await network.provider.send("hardhat_reset", [
    {
      forking: {
        jsonRpcUrl: config.networks.hardhat.forking.url,
        blockNumber: config.networks.hardhat.forking.blockNumber,
      },
    },
  ]);

  signers = await ethers.getSigners()
  cardinal = signers[0]
  priest1 = signers[1]
  priest2 = signers[2]
  disciple1 = signers[3]
  disciple2 = signers[4]
  disciple3 = signers[5]

  MockERC1155Factory = await ethers.getContractFactory('MockERC1155', cardinal)
  OSOpenStorefront = await MockERC1155Factory.attach('0x495f947276749Ce646f68AC8c248420045cb7b5e')

  JesusFactory = await ethers.getContractFactory('SubwayJesusPamphlets', cardinal)
  Jesus = await JesusFactory.deploy(OSOpenStorefront.address)
  await Jesus.deployed()

  JesusDAOFactory = await ethers.getContractFactory('ChurchOfSubwayJesusPamphlets')
  JesusDAO = await JesusDAOFactory.attach(
    await Jesus.connect(cardinal).church()
  )

  MetadataFactory = await ethers.getContractFactory('Metadata')
  Metadata = await MetadataFactory.attach(
    await Jesus.connect(cardinal).metadataContract()
  )
}

describe('SubwayJesusPamphlets', () => {
  beforeEach(setup)

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

      await JesusDAO.connect(cardinal).execute(Jesus.address, 0, mintBatchCalldata, 0)

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
      await JesusDAO.connect(cardinal).execute(Jesus.address, 0, transferChurchCalldata, 0)

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
      await JesusDAO.connect(cardinal).execute(Jesus.address, 0, setMetadataContractCalldata, 0)

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
      await JesusDAO.connect(cardinal).execute(Jesus.address, 0, setRoyaltyInfoCalldata, 0)

      const updatedRoyaltyInfo = await Jesus.connect(cardinal).royaltyInfo(0, 100)
      expect(updatedRoyaltyInfo[0]).to.equal(priest1.address)
      expect(updatedRoyaltyInfo[1].toNumber()).to.equal(15)
    })

  })
})

describe('SubwayJesusPamphlets Metadata', () => {
  beforeEach(setup)

  it('should work', async () => {
    expect(await Jesus.connect(cardinal).tokenURI(0)).to.equal('ipfs://bafybeib5wqab3uj7zcoajmmykwqiglqgdkb5dnuc2fecdaxx6tkwfhlrse/0.json')
  })
})

describe('SubwayJesusPamphlets mainnet fork', () => {
  beforeEach(mainnetForkSetup)

  describe('onERC1155Received', () => {
    it('should work for SJP tokens', async () => {
      const steviepETH = await ethers.getImpersonatedSigner("0x47144372eb383466D18FC91DB9Cd0396Aa6c87A4");

      await OSOpenStorefront.connect(steviepETH).safeTransferFrom(steviepETH.address, Jesus.address, '32150014705918146096138927293761864425970273519802704166038767682366363140097', 1, [])
      await OSOpenStorefront.connect(steviepETH).safeTransferFrom(steviepETH.address, Jesus.address, '32150014705918146096138927293761864425970273519802704166038767671371246862337', 1, [])
      await OSOpenStorefront.connect(steviepETH).safeTransferFrom(steviepETH.address, Jesus.address, '32150014705918146096138927293761864425970273519802704166038767657077595701249', 1, [])

      expect(await Jesus.connect(cardinal).balanceOf(steviepETH.address)).to.equal(3)

      expect(await Jesus.connect(cardinal).ownerOf(53)).to.equal(steviepETH.address)
      expect(await Jesus.connect(cardinal).ownerOf(65)).to.equal(steviepETH.address)
      expect(await Jesus.connect(cardinal).ownerOf(75)).to.equal(steviepETH.address)

      // should forward old tokens to DAO

      expect(await OSOpenStorefront.connect(cardinal).balanceOf(JesusDAO.address, '32150014705918146096138927293761864425970273519802704166038767682366363140097')).to.equal(1)
      expect(await OSOpenStorefront.connect(cardinal).balanceOf(JesusDAO.address, '32150014705918146096138927293761864425970273519802704166038767671371246862337')).to.equal(1)
      expect(await OSOpenStorefront.connect(cardinal).balanceOf(JesusDAO.address, '32150014705918146096138927293761864425970273519802704166038767657077595701249')).to.equal(1)
    })
  })
})


describe('ChurchOfSubwayJesusPamphlets', () => {
  beforeEach(async () => {
    await setup()

    for (let i = 1; i <= 25; i++) {
      const tokenId = osTokenData[i-1].os_token_id
      await MockERC1155.connect(cardinal).mint(disciple1.address, tokenId)
      await MockERC1155.connect(disciple1).safeTransferFrom(disciple1.address, Jesus.address, tokenId, 1, [])
    }

    for (let i = 26; i <= 50; i++) {
      const tokenId = osTokenData[i-1].os_token_id
      await MockERC1155.connect(cardinal).mint(disciple2.address, tokenId)
      await MockERC1155.connect(disciple2).safeTransferFrom(disciple2.address, Jesus.address, tokenId, 1, [])
    }

    for (let i = 51; i <= 75; i++) {
      const tokenId = osTokenData[i-1].os_token_id
      await MockERC1155.connect(cardinal).mint(disciple3.address, tokenId)
      await MockERC1155.connect(disciple3).safeTransferFrom(disciple3.address, Jesus.address, tokenId, 1, [])
    }

    await Jesus.connect(disciple1)[safeTransferFrom](disciple1.address, disciple2.address, 26)
    await Jesus.connect(disciple1)[safeTransferFrom](disciple1.address, disciple2.address, 27)

    await Jesus.connect(disciple3)[safeTransferFrom](disciple3.address, disciple1.address, 8)
    await Jesus.connect(disciple3)[safeTransferFrom](disciple3.address, disciple1.address, 9)

    await Jesus.connect(disciple2)[safeTransferFrom](disciple2.address, disciple3.address, 52)
    await Jesus.connect(disciple2)[safeTransferFrom](disciple2.address, disciple3.address, 54)
  })

  describe('standard castVote/execute', () => {
    it('execute should work for the cardinal regardless of whether quorum is reached', async () => {
      const originalTotalSupply = await Jesus.connect(cardinal).totalSupply()
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      await JesusDAO.connect(cardinal).execute(Jesus.address, 0, mintOneCalldata, 0)

      expect(Number(await Jesus.connect(cardinal).totalSupply())).to.equal(Number(originalTotalSupply) + 1)
    })

    it('voting should revert if signer does not own the token', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await expectRevert(
        JesusDAO.connect(disciple2).castVote(proposalId, 1, true),
        'Voter must be owner of token'
      )
    })


    it('execute should revert if quorum is not reached', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      for (let i = 1; i <= 25; i++) {
        await JesusDAO.connect(disciple1).castVote(proposalId, i, true)
      }

      for (let i = 26; i <= 38; i++) {
        await JesusDAO.connect(disciple2).castVote(proposalId, i, true)
      }

      // defaul quorum is 51%, which is > 38 votes

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(proposal[0]).to.equal(false)
      expect(Number(proposal[1])).to.equal(38)

      await expectRevert(
        JesusDAO.connect(disciple1).execute(Jesus.address, 0, mintOneCalldata, 0),
        'Insufficient votes to execute proposal'
      )
    })


    it('happy path should work', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      for (let i = 1; i <= 25; i++) {
        await JesusDAO.connect(disciple1).castVote(proposalId, i, true)
      }

      for (let i = 26; i <= 39; i++) {
        await JesusDAO.connect(disciple2).castVote(proposalId, i, true)
      }

      const originalTotalSupply = await Jesus.connect(disciple1).totalSupply()
      await JesusDAO.connect(disciple1).execute(Jesus.address, 0, mintOneCalldata, 0)

      expect(Number(await Jesus.connect(disciple1).totalSupply())).to.equal(Number(originalTotalSupply) + 1)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)

      expect(proposal[0]).to.equal(true)
      expect(Number(proposal[1])).to.equal(39)

      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 39)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 40)).to.equal(false)

      await expectRevert(
        JesusDAO.connect(disciple1).execute(Jesus.address, 0, mintOneCalldata, 0),
        'Proposal has already been executed'
      )
    })


    it('castVote should allow unvoting, but not double voting', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      for (let i = 1; i <= 25; i++) {
        await JesusDAO.connect(disciple1).castVote(proposalId, i, true)
      }

      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)

      await JesusDAO.connect(disciple1).castVote(proposalId, 2, false)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(24)

      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 2)).to.equal(false)
    })
  })

  describe('execution', () => {
    it('should work if all the params are the same except for key', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId0 = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)
      const proposalId1 = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 1)

      await JesusDAO.connect(disciple1).castVotes(proposalId0, times(25, i => i+1), true)
      await JesusDAO.connect(disciple2).castVotes(proposalId0, times(25, i => i+26), true)

      await JesusDAO.connect(disciple1).execute(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple1).castVotes(proposalId1, times(25, i => i+1), true)
      await JesusDAO.connect(disciple2).castVotes(proposalId1, times(25, i => i+26), true)

      await JesusDAO.connect(disciple1).execute(Jesus.address, 0, mintOneCalldata, 1)
    })
  })

  describe('delegate', () => {
    it('should delegate votes', async () => {
      await JesusDAO.connect(disciple1).delegate([1, 2, 3], priest1.address)

      expect(await JesusDAO.connect(disciple1).delegations(1)).to.equal(priest1.address)
      expect(await JesusDAO.connect(disciple1).delegations(2)).to.equal(priest1.address)
      expect(await JesusDAO.connect(disciple1).delegations(3)).to.equal(priest1.address)
    })

    it('should revert if signer does not own the token', async () => {
      await expectRevert(
        JesusDAO.connect(disciple1).delegate([1, 2, 26], priest1.address),
        'Signer must own token to delegate'
      )
    })

    it('delegator should be able to vote even if token is delegated', async () => {
      await JesusDAO.connect(disciple1).delegate([1], priest1.address)

      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple1).castVote(proposalId, 1, true)
      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(1)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
    })
  })

  describe('castVotes', () => {
    it('should update vote count for all tokens included', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple1).castVotes(proposalId, times(25, i => i + 1), true)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(25)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 25)).to.equal(true)
    })

    it('should work for delegated tokens', async () => {
      await JesusDAO.connect(disciple1).delegate([1], priest1.address)
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(priest1).castVotes(proposalId, [1], true)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(1)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
    })

    it('should not work for tokens delegated to someone else', async () => {
      await JesusDAO.connect(disciple1).delegate([1], priest1.address)
      await JesusDAO.connect(disciple1).delegate([2], priest2.address)

      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await expectRevert(
        JesusDAO.connect(priest2).castVotes(proposalId, [1], true),
        'Voter must be owner or delegator of all tokens'
      )
    })

    it('should work for a mix of owned and delegated tokens', async () => {
      await JesusDAO.connect(disciple1).delegate([1], disciple2.address)
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple2).castVotes(proposalId, [1, 26], true)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(2)
    })

    it('should revert if signer does not own or have delegation for all the tokens', async () => {
      await JesusDAO.connect(disciple1).delegate([1], disciple2.address)
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await expectRevert(
        JesusDAO.connect(disciple2).castVotes(proposalId, [2, 26], true),
        'Voter must be owner or delegator of all tokens'
      )

      await expectRevert(
        JesusDAO.connect(disciple2).castVotes(proposalId, [1, 25], true),
        'Voter must be owner or delegator of all tokens'
      )

      await JesusDAO.connect(disciple2).castVotes(proposalId, [1, 26], true)
      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(2)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 2)).to.equal(false)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 25)).to.equal(false)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 26)).to.equal(true)
    })

    it('should update the vote count be the correct amount if multiple votes for same token included', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple1).castVotes(proposalId, [1, 2, 3,3,3,3,3,3,3], true)
      await JesusDAO.connect(disciple1).castVotes(proposalId, [1, 2, 3,3,3,3,3,3,3], true)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(3)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 1)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 2)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 3)).to.equal(true)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 4)).to.equal(false)
    })

    it('should update the vote count be the correct amount if overwriting a previous vote', async () => {
      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(Jesus.address, 0, mintOneCalldata, 0)

      await JesusDAO.connect(disciple1).castVote(proposalId, 3, true)
      await JesusDAO.connect(disciple1).castVotes(proposalId, [1, 2, 3], false)

      const proposal = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal[1])).to.equal(0)
      expect(await JesusDAO.connect(disciple1).proposalVotes(proposalId, 3)).to.equal(false)


      await JesusDAO.connect(disciple1).castVotes(proposalId, [1, 2, 3], true)

      const proposal_ = await JesusDAO.connect(disciple1).proposals(proposalId)
      expect(Number(proposal_[1])).to.equal(3)
    })
  })


  // describe('castVotesBySig')

  describe('electCardinal', () => {
    it('should elect a new cardinal', async () => {
      const electCardinalCalldata = encodeWithSignature('electCardinal', ['address'], [priest2.address])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(JesusDAO.address, 0, electCardinalCalldata, 0)

      await JesusDAO.connect(disciple1).castVotes(proposalId, times(25, i => i+1), true)
      await JesusDAO.connect(disciple2).castVotes(proposalId, times(25, i => i+26), true)

      await JesusDAO.connect(disciple3).execute(JesusDAO.address, 0, electCardinalCalldata, 0)
      expect(await JesusDAO.connect(disciple3).cardinal()).to.equal(priest2.address)

      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      await expectRevert(
        JesusDAO.connect(cardinal).execute(Jesus.address, 0, mintOneCalldata, 0),
        'Insufficient votes to execute proposal'
      )

      await JesusDAO.connect(priest2).execute(Jesus.address, 0, mintOneCalldata, 0)
    })

    it('should revert if not called by the church or cardinal', async() => {
      await expectRevert(
        JesusDAO.connect(priest2).electCardinal(priest2.address),
        'Can only be called by the church'
      )
    })
  })

  describe('updateQuorumNeeded', () => {
    it('should update quorum', async () => {
      const updateQuorumCalldata = encodeWithSignature('updateQuorumNeeded', ['uint256'], [10]) // 8 votes
      await JesusDAO.connect(cardinal).execute(JesusDAO.address, 0, updateQuorumCalldata, 0)

      expect(await JesusDAO.connect(cardinal).quorumNeeded()).to.equal(10)

      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(JesusDAO.address, 0, mintOneCalldata, 0)
      await JesusDAO.connect(disciple1).castVotes(proposalId, times(7, i => i+1), true)


      await expectRevert(
        JesusDAO.connect(disciple1).execute(JesusDAO.address, 0, mintOneCalldata, 0),
        'Insufficient votes to execute proposal'
      )
      await JesusDAO.connect(disciple1).castVote(proposalId, 8, true)
      await JesusDAO.connect(disciple1).execute(JesusDAO.address, 0, mintOneCalldata, 0)
    })

    it('should revert if not called by the church or cardinal', async() => {
      await expectRevert(
        JesusDAO.connect(priest2).updateQuorumNeeded(10),
        'Can only be called by the church'
      )
    })
  })

  describe.skip('hashVote/verifySignature', () => {
    it('should work', async () => {

      console.log('cardinal', cardinal.address)
      console.log('disciple1', disciple1.address)
      console.log('disciple2', disciple2.address)
      console.log('disciple3', disciple3.address)
      console.log('priest1', priest1.address)
      console.log('priest2', priest2.address)
      console.log('JesusDAO', JesusDAO.address)
      console.log('Jesus', Jesus.address)

      const mintOneCalldata = encodeWithSignature('mintBatch', ['address[]'], [[disciple1.address]])
      const proposalId = await JesusDAO.connect(disciple1).hashProposal(JesusDAO.address, 0, mintOneCalldata, 0)

      const now = Number(await time.latest())
      const expiration = Number(now + time.duration.days(1))

      const digestHash = await JesusDAO.connect(disciple1).hashVote(proposalId, 1, true, now + expiration)
      console.log(digestHash, ethers.utils.id(digestHash))
      const signature = await disciple1.signMessage(ethers.utils.id(digestHash))

      const signedAddress = await JesusDAO.connect(cardinal).verifySignature(proposalId, 1, true, now + expiration, signature)
      expect(signedAddress).to.equal(disciple1.address)
    })
  })
})
