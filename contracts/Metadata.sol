// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

contract Metadata {
  function tokenURI(uint256 tokenId) external view returns (string memory) {
    return 'ipfs://';
  }
}
