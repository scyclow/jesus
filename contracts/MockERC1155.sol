// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
  constructor() ERC1155('') {}

  function mint(address to, uint256 id) external {
    _mint(to, id, 1, '');
  }
}