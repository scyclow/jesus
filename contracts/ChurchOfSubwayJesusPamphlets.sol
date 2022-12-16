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

interface IOSOpenStorefront {
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes calldata data
  ) external;

  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] calldata ids,
    uint256[] calldata amounts,
    bytes calldata data
  ) external;
}

contract ChurchOfSubwayJesusPamphlets is ERC721 {
  uint256 private _totalSupply = 76;
  Metadata private _metadataContract;
  address public church;
  IOSOpenStorefront private _purgatory;


  address private royaltyBenificiary;
  uint16 private royaltyBasisPoints = 1000;

  constructor(address _os) ERC721("Church of Subway Jesus Pamphlets", 'JESUS') {
    royaltyBenificiary = msg.sender;
    _metadataContract = new Metadata();
    _purgatory = IOSOpenStorefront(_os);
    church = address(new ChurchOfSubwayJesusPamphletsDAO(this, msg.sender));

    // mint tokens 0 - 75
    _mint(msg.sender, 0);

    for (uint256 i = 1; i < 76; i++) {
      _mint(0x6666666666666666666666666666666666666666, i);
    }
  }

  function purgatory() public view returns (address) {
    return address(_purgatory);
  }

  modifier onlyChurch {
    require(church == msg.sender, 'Caller is not the church');
    _;
  }

  function transferChurch(address newChurch) external onlyChurch {
    church = newChurch;
  }


  function onERC1155Received(
    address,
    address from,
    uint256 id,
    uint256 value,
    bytes calldata
  ) external returns (bytes4) {


    // require(msg.sender == address(_purgatory), 'Sender must be OS open storefront');
    // require(value == 1, 'Value must be 1');
    // // TODO id stuff
    uint newId = id;


    _purgatory.safeTransferFrom(address(this), church, id, value, '');
    _transfer(0x6666666666666666666666666666666666666666, from, newId);


    // 0xf23a6e61
    return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
  }


  function onERC1155BatchReceived(
    address,
    address from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata
  ) external returns (bytes4) {
    require(msg.sender == address(_purgatory), 'Sender must be OS open storefront');
    require(ids.length == values.length);

    for (uint256 i; i < ids.length; i++) {
      require(values[i] == 1, 'Value must be 1');

      uint256 id = ids[1];

      // TODO id stuff
      uint newId = id;
      _purgatory.safeTransferFrom(address(this), church, id, 1, '');
      _transfer(0x6666666666666666666666666666666666666666, from, newId);

    }

    // 0xbc197c81
    bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
  }


  function mintBatch(address[] calldata to) external onlyChurch {
    for (uint256 i; i < to.length; i++) {
      _mint(to[i], _totalSupply + i);
    }
    _totalSupply += to.length;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return _metadataContract.tokenURI(tokenId);
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
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
      church == _msgSender() || ERC721.ownerOf(tokenId) == _msgSender(),
      'Only project or token owner can emit token event'
    );
    emit TokenEvent(_msgSender(), tokenId, eventType, content);
  }
}