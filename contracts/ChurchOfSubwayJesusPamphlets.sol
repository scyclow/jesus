// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";
import "./SubwayJesusPamphlets.sol";

contract ChurchOfSubwayJesusPamphlets is IERC721Receiver {
  SubwayJesusPamphlets public baseContract;

  address public cardinal;
  uint256 public quorumNeeded = 51;

  struct Proposal {
    bool executed;
    uint256 totalVotes;
  }

  mapping(uint256 => Proposal) private _proposals;
  mapping(uint256 => mapping(uint256 => bool)) private _proposalVotes;
  mapping(uint256 => address) public delegations;

  constructor(SubwayJesusPamphlets _addr, address _cardinal) {
    baseContract = _addr;
    cardinal = _cardinal;
  }

  function proposalVotes(uint256 proposalId, uint256 tokenId) public view returns (bool) {
    return _proposalVotes[proposalId][tokenId];
  }

  function proposals(uint256 proposalId) public view returns (bool executed, uint256 totalVotes) {
    return (_proposals[proposalId].executed, _proposals[proposalId].totalVotes);
  }

  /*
    target    - target contract
    value     - amount of ETH to send
    calldata_ - abi.encodeWithSignature("functionToCall(string,uint256)", "arg1", 123)
    nonce     - can be any number; exists to make sure same proposal can't be executed twice
  */
  function hashProposal(
    address target,
    uint256 value,
    bytes memory calldata_,
    uint256 nonce
  ) public pure returns (uint256) {
    return uint256(keccak256(abi.encode(target, value, calldata_, nonce)));
  }


  function castVote(uint256 proposalId, uint256 tokenId, bool vote) public {
    require(baseContract.ownerOf(tokenId) == msg.sender, 'Voter must be owner of token');
    _castVote(proposalId, tokenId, vote);
  }

  function castVotes(uint256 proposalId, uint256[] calldata tokenIds, bool vote) public {
    for (uint256 i; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      require(
        baseContract.ownerOf(tokenId) == msg.sender
        || delegations[tokenId] == msg.sender,
        "Voter must be owner or delegator of all tokens"
      );
      _castVote(proposalId, tokenId, vote);
    }
  }

  function castVotesBySig(
    uint256 proposalId,
    bytes[] calldata signatures,
    address[] calldata owners,
    uint256[] calldata tokenIds,
    bool[] calldata votes
  ) public {
    require(owners.length == signatures.length);
    require(tokenIds.length == signatures.length);
    require(votes.length == signatures.length);

    for (uint256 i; i < votes.length; i++) {
      address owner = owners[i];
      uint256 tokenId = tokenIds[i];
      bool vote = votes[i];
      // TODO verify votes are valid
      _castVote(proposalId, tokenId, vote);
    }
  }

  function delegate(uint256[] calldata tokenIds, address delegator) public {
    for (uint256 i; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      require(baseContract.ownerOf(tokenId) == msg.sender, "Signer must own token to delegate");
      delegations[tokenId] = delegator;
    }
  }


  function _castVote(uint256 proposalId, uint256 tokenId, bool vote) private {
    if (_proposalVotes[proposalId][tokenId] == vote) return;

    _proposalVotes[proposalId][tokenId] = vote;

    if (vote) {
      _proposals[proposalId].totalVotes += 1;
    } else {
      _proposals[proposalId].totalVotes -= 1;
    }
  }

  function execute(
    address target,
    uint256 value,
    bytes memory calldata_,
    uint256 nonce
  ) public payable returns (uint256) {
    uint256 proposalId = hashProposal(target, value, calldata_, nonce);

    Proposal storage proposal = _proposals[proposalId];

    require(!proposal.executed, "Proposal has already been executed");

    if (msg.sender != cardinal) {
      require(
        proposal.totalVotes * 100 >= (baseContract.totalSupply() * quorumNeeded),
        "Insufficient votes to execute proposal"
      );
    }

    proposal.executed = true;


    (bool success, bytes memory returndata) = target.call{value: value}(calldata_);
    Address.verifyCallResult(success, returndata, "Proposal execution reverted");

    return proposalId;
  }


  modifier onlyChurch {
    require(address(this) == msg.sender, 'Can only be called by the church');
    _;
  }

  function electCardinal(address _cardinal) public onlyChurch {
    cardinal = _cardinal;
  }

  function updateQuorumNeeded(uint256 quorumPercent) public onlyChurch {
    quorumNeeded = quorumPercent;
  }


  function onERC721Received(address, address, uint256, bytes calldata) external pure returns(bytes4) {
    return this.onERC721Received.selector;
  }

  function onERC1155Received(address, address, uint256, uint256, bytes calldata) external returns (bytes4) {
    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external returns (bytes4) {
    return this.onERC1155BatchReceived.selector;
  }

  receive() external payable {}
  fallback() external payable {}
}