// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";

contract Metadata {
  using Strings for uint256;

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    return string(abi.encodePacked('ipfs://', tokenId.toString(), '.json'));
  }
}
