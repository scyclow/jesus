const { expect } = require("chai")

const expectFailure = async (fn, err) => {
  let failure
  try {
    await fn()
  } catch (e) {
    failure = e
  }
  expect(failure.message).to.include(err)
}

const num = n => Number(ethers.utils.formatEther(n))

xdescribe('DiscountFastCash', () => {
  it('should work', async () => {
    const [
      _, __,
      god,
      centralBanker,
      platform,
      charity,
      luckyParticipant1,
      luckyParticipant2,
      luckyParticipant3,
      ...signers
    ] = await ethers.getSigners();


    FastCashMoneyPlus = await ethers.getContractFactory('FastCashMoneyPlus', god);
    DiscountFastCash = await ethers.getContractFactory('DiscountFastCash', god);
    deployedFastCashContract = await FastCashMoneyPlus.deploy();
    await deployedFastCashContract.deployed();
    deployedDiscountFastCashContract = await DiscountFastCash.deploy(deployedFastCashContract.address, platform.address, charity.address);
    await deployedDiscountFastCashContract.deployed();
    await deployedDiscountFastCashContract.connect(god).transferOwnership(centralBanker.address)

    expect(await deployedDiscountFastCashContract.fastcashContract()).to.equal(deployedFastCashContract.address)

    await deployedFastCashContract.connect(god).transferFromBank(deployedDiscountFastCashContract.address, ethers.utils.parseEther('2'))


    await deployedDiscountFastCashContract.connect(luckyParticipant1).buy({ value: ethers.utils.parseEther('0.25') })

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).buy({ value: ethers.utils.parseEther('0.25') }),
      "Your luck has run out"
    )


    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).flipIsLocked(),
      "Only owner can flip the lock"
    )

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).transferOwnership(luckyParticipant1.address),
      "Only owner can transfer ownership"
    )

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).updatePrice(ethers.utils.parseEther('0.1')),
      "Only owner can update the price"
    )

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).withdraw(ethers.utils.parseEther('0.1')),
      "Only owner can withdraw"
    )

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).updatePlatform(luckyParticipant1.address, 1),
      "Only owner can update platform info"
    )

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant1).updatePlatform(luckyParticipant1.address, 1),
      "Only owner can update platform info"
    )


    await deployedDiscountFastCashContract.connect(centralBanker).flipIsLocked()

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant2).buy({ value: ethers.utils.parseEther('0.25') }),
      "Discounts are locked up at the moment"
    )
    await deployedDiscountFastCashContract.connect(centralBanker).flipIsLocked()


    await deployedDiscountFastCashContract.connect(luckyParticipant2).buy({ value: ethers.utils.parseEther('0.25') })

    await expectFailure(
      () => deployedDiscountFastCashContract.connect(luckyParticipant3).buy({ value: ethers.utils.parseEther('0.25') }),
      "FastCash balance has run dry"
    )

    // luckyParticipant2.sendTransaction({
    //   to: deployedDiscountFastCashContract.address,
    //   value: ethers.utils.parseEther('100')
    // })



    console.log(`
      centralBankerBalance: ${num(await centralBanker.getBalance())}
      platformBalance: ${num(await platform.getBalance())}
      charityBalance: ${num(await charity.getBalance())}
      luckyParticipant1Balance: ${num(await luckyParticipant1.getBalance())}
      luckyParticipant2Balance: ${num(await luckyParticipant2.getBalance())}
      luckyParticipant3Balance: ${num(await luckyParticipant3.getBalance())}
      luckyParticipant1FCBalance: ${num(await deployedFastCashContract.balanceOf(luckyParticipant1.address))}
      luckyParticipant2FCBalance: ${num(await deployedFastCashContract.balanceOf(luckyParticipant2.address))}
    `)

  })
})

describe('SteviepNFT', () => {
  it('should work', async () => {
    const [
      _, __,
      devWallet,
      owner,
      tokenHolder1,
      tokenHolder2,
      tokenHolder3,
      ...signers
    ] = await ethers.getSigners()


    const SteviepNFT = await ethers.getContractFactory('SteviepNFT', devWallet)
    const SteviepNFTContract = await SteviepNFT.deploy(
      'SteviepNFT',
      'SPNFT',
      'https://steviep.xyz',
      'https://steviep.xyz/images/',
      'NFT #',
      '',
      'https://steviep.xyz/',
      'Base NFT contract',
      owner.address
    )

    await SteviepNFTContract.deployed()

    await SteviepNFTContract.connect(owner).safeMint(owner.address)
    await SteviepNFTContract.connect(owner).safeMint(tokenHolder1.address)
    await SteviepNFTContract.connect(owner).safeMint(tokenHolder2.address)
    await SteviepNFTContract.connect(owner).safeMint(tokenHolder3.address)

    console.log(await SteviepNFTContract.connect(owner).ownerOf(1))
    console.log(await SteviepNFTContract.connect(owner).ownerOf(2))
    console.log(await SteviepNFTContract.connect(owner).ownerOf(3))
    console.log(await SteviepNFTContract.connect(owner).ownerOf(4))


    const metadata0 = await SteviepNFTContract.connect(owner).tokenURI(1)
    console.log(Buffer.from(metadata0.split(',')[1], 'base64').toString('utf-8'))

    await SteviepNFTContract.connect(owner).flipUseURIPointer()

    await SteviepNFTContract.connect(owner).updateBaseUrl('www.bing.com/', '.html')
    const metadata1 = await SteviepNFTContract.connect(owner).tokenURI(1)
    console.log(metadata1)

    await SteviepNFTContract.connect(owner).flipUseURIPointer()

    const metadata2 = await SteviepNFTContract.connect(owner).tokenURI(1)
    console.log(Buffer.from(metadata2.split(',')[1], 'base64').toString('utf-8'))

    await SteviepNFTContract.connect(owner).updateMetadataParams(
      'Edition',
      ' out of 256',
      'prettyPictures/',
      '.jpg',
      'www.google.com/tokenPage/',
      'MIT'
    )
    await SteviepNFTContract.connect(owner).updateProjectDescription('new description')


    const metadata3 = await SteviepNFTContract.connect(owner).tokenURI(1)
    console.log(Buffer.from(metadata3.split(',')[1], 'base64').toString('utf-8'))


    await SteviepNFTContract.connect(owner).emitProjectEvent('projectGreeting', 'Hello project')
    await SteviepNFTContract.connect(owner).emitTokenEvent(1, 'tokenGreeting', 'Hello token 1')
    await SteviepNFTContract.connect(tokenHolder1).emitTokenEvent(2, 'tokenGreeting', 'Hello token 2 holder')

    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).safeMint(tokenHolder2.address), 'Caller is not the minting address')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).flipUseURIPointer(), 'Ownable:')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).updateBaseUrl('www.wrong.com', '.wrong'), 'Ownable:')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).emitProjectEvent('projectGreeting', 'wrong project event'), 'Ownable:')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).emitTokenEvent(1, 'tokenGreeting', 'wrong token event'), 'Only project or token owner can emit token event')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).updateProjectDescription('wong description'), 'Ownable:')
    await expectFailure(() => SteviepNFTContract.connect(tokenHolder2).updateMetadataParams(
      '@',
      ' of 257',
      'wrongPictures/',
      '.wrong',
      'www.wrong.com/wrongPage/',
      'ISC'
    ), 'Ownable:')



    await SteviepNFTContract.connect(tokenHolder1).setApprovalForAll(tokenHolder2.address, true)
    await SteviepNFTContract.connect(owner).setOperatorDenial(tokenHolder2.address, true)

    const safeTransferFrom = "safeTransferFrom(address,address,uint256)"
    await expectFailure(() =>
      SteviepNFTContract.connect(tokenHolder2)[safeTransferFrom](tokenHolder1.address, tokenHolder3.address, 2)
    , 'Operator denied')


    await SteviepNFTContract.connect(tokenHolder1)[safeTransferFrom](tokenHolder1.address, tokenHolder3.address, 2)
  })
})