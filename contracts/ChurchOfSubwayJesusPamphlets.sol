// SPDX-License-Identifier: MIT


/*
  /$$$$$$  /$$$$$$$$ /$$$$$$$$ /$$    /$$ /$$$$$$ /$$$$$$$$ /$$$$$$$
 /$$__  $$|__  $$__/| $$_____/| $$   | $$|_  $$_/| $$_____/| $$__  $$
| $$  \__/   | $$   | $$      | $$   | $$  | $$  | $$      | $$  \ $$
|  $$$$$$    | $$   | $$$$$   |  $$ / $$/  | $$  | $$$$$   | $$$$$$$/
 \____  $$   | $$   | $$__/    \  $$ $$/   | $$  | $$__/   | $$____/
 /$$  \ $$   | $$   | $$        \  $$$/    | $$  | $$      | $$
|  $$$$$$/   | $$   | $$$$$$$$   \  $/    /$$$$$$| $$$$$$$$| $$
 \______/    |__/   |________/    \_/    |______/|________/|__/

*/

import "./Dependencies.sol";
import "./Metadata.sol";
import "./ChurchOfSubwayJesusPamphletsDAO.sol";

pragma solidity ^0.8.11;

contract ChurchOfSubwayJesusPamphlets is ERC721 {
  uint256 private _upgradedPamphlets = 0;
  uint256 private _legacyPamphlets = 75;
  uint256 private _newPamphlets = 0;
  SequencesMetadata private _metadataContract;
  ChurchOfSubwayJesusPamphletsDAO private _church;

  address private royaltyBenificiary;
  uint16 private royaltyBasisPoints = 1000;

  constructor() ERC721("Church of Subway Jesus Pamphlets", 'JESUS') {
    royaltyBenificiary = msg.sender;
    _metadataContract = new Metadata(this);
    _church = new ChurchOfSubwayJesusPamphletsDAO(this);

    // start total supply at 75 or 76
    // change balance of 0x0 to 76
    // emit a bunch of events where all original tokens are transferred to 0x0
  }

  function church() public view returns (address) {
    return address(_church);
  }

  modifier onlyChurch {
    require(_church == msg.sender, 'Caller is not the church');
    _;
  }

  // require user to approve this contract for specific token id
  function redeem(uint256 fullTokenId) {
    uint256 humanTokenId = fullTokenId & 0x000000000000000000000000000000000000000000000000000000FFFFFFFFFF;
    uint256 trimmed = fullTokenId & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000000000;
    uint256 shifted = trimmed >> 40;
    uint256 isSubwayJesusToken = shifted == 0x7C23C1B7E544E3E805BA675C811E287FC9D719490000000000001B;
    require(isSubwayJesusToken);

    // require openseaStorefront.balanceOf(tokenId, msg.sender) == 1
    // openseaStorefront.safeTransfer original to address(this)
    // mint new pamphlet
    _upgradedPamphlets++;
  }

  // TODO downgrade token -- burn new token and receive old one

  function mintBatch(address[] to) external onlyChurch {
    for (uint256 i; i < to.length; i++) {
      _mint(to[i], _legacyPamphlets + _newPamphlets);
      _newPamphlets++;
    }
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return _metadataContract.tokenURI(tokenId);
  }

  function totalSupply() external view returns (uint256) {
    return _upgradedPamphlets + _newPamphlets;
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
    // ERC2981
    return interfaceId == bytes4(0x2a55205a) || super.supportsInterface(interfaceId);
  }

  function metadataContract() external view returns (address) {
    return address(_metadataContract);
  }

  function setMetadataContract(address _addr) external onlyChurch {
    _metadataContract = Metadata(_addr);
  }


  function setRoyaltyInfo(
    address _royaltyBenificiary,
    uint16 _royaltyBasisPoints
  ) external onlyChurch {
    royaltyBenificiary = _royaltyBenificiary;
    royaltyBasisPoints = _royaltyBasisPoints;
  }

  function royaltyInfo(uint256, uint256 _salePrice) external view returns (address, uint256) {
    return (royaltyBenificiary, _salePrice * royaltyBasisPoints / 10000);
  }


  event ProjectEvent(
    address indexed poster,
    string indexed eventType,
    string content
  );
  event TokenEvent(
    address indexed poster,
    uint256 indexed tokenId,
    string indexed eventType,
    string content
  );

  function emitProjectEvent(string calldata eventType, string calldata content) external onlyChurch {
    emit ProjectEvent(_msgSender(), eventType, content);
  }

  function emitTokenEvent(uint256 tokenId, string calldata eventType, string calldata content) external {
    require(
      owner() == _msgSender() || ERC721.ownerOf(tokenId) == _msgSender(),
      'Only project or token owner can emit token event'
    );
    emit TokenEvent(_msgSender(), tokenId, eventType, content);
  }
}