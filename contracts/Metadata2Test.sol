// SPDX-License-Identifier: MIT

import "./Dependencies.sol";

pragma solidity ^0.8.23;




contract Metadata2Test is ERC721 {
  using Strings for uint256;


  string public baseURI = 'ipfs://QmWkGohobRy75Kqmp2tNsvrrNn4DLjNJtgMqPBjFnUPzMx/';

  constructor() ERC721("Subway Jesus Pamphlets TEST", 'JESUS') {
    for (uint256 i = 0; i < 175; i++) {
      _mint(0x6666666666666666666666666666666666666666, i);
    }
  }


  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return string(abi.encodePacked(baseURI, tokenId.toString(), '.json'));
  }


}

