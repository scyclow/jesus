// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./Dependencies.sol";
import "./ChurchOfSubwayJesusPamphlets.sol";

contract ChurchOfSubwayJesusPamphletsDAO is IERC721Receiver {
  ChurchOfSubwayJesusPamphlets public baseContract;

  address public cardinal;

  struct Proposal {
    bool executed;
    uint256 totalVotes;
    uint256 maxVotes;
  }

  mapping(uint256 => Proposal) public proposals;
  mapping(uint256 => mapping(uint256 => bool)) public proposalVotes;
  mapping(uint256 => address) public delegations;

  constructor(ChurchOfSubwayJesusPamphlets _addr) {
    baseContract = _addr;
    cardinal = msg.sender;
  }

  function hashProposal(
    address target,
    uint256 value,
    bytes memory calldata_
  ) public pure returns (uint256) {
    return uint256(keccak256(abi.encode(target, value, calldata_)));
  }


  /*
    target    - target contract
    value     - amount of ETH to send
    calldata_ - abi.encodeWithSignature("functionToCall(string,uint256)", "arg1", 123)
  */
  function propose(
    uint256 tokenId,
    address target,
    uint256 value,
    bytes memory calldata_
  ) public returns (uint256) {
    uint256 proposalId = hashProposal(target, value, calldata_);
    // TODO figure out how to make sure increasing supply doesn't fuck up quorum
    proposals[proposalId].maxVotes = baseContract.totalSupply();

    castVote(proposalId, tokenId, true);

    return proposalId;
  }

  function castVote(uint256 proposalId, uint256 tokenId, bool vote) public {
    require(baseContract.ownerOf(tokenId) == msg.sender);
    _castVotes(proposalId, [tokenId], vote);
  }

  function castVotesBySig(
    uint256 proposalId,
    bytes[] calldata signatures,
    address[] calldata owners,
    uint256[] calldata tokenIds,
    bool calldata vote
  ) public {
    require(owners.length == signatures.length);
    require(tokenIds.length == signatures.length);
    require(votes.length == signatures.length);


    for (uint256 i; i < votes.length; i++) {
      address owner = owners[i];
      address tokenId = tokenIds[i];
      address vote = votes[i];
      // TODO verify votes are valid
    }

    _castVotes(proposalId, tokenIds, vote);
  }

  function castDelegatedVote(uint256 proposalId, uint256[] calldata tokenIds, bool vote) public {
    for (uint256 i; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      require(delegations[tokenId] == msg.sender);
    }

    _castVotes(proposalId, tokenIds, vote);
  }

  function delegate(uint256 tokenId, address priest) public {
    require(baseContract.ownerOf(tokenId) == msg.sender);
    delegations[tokenId] = address;
  }


  function _castVotes(uint256 proposalId, uint256[] calldata tokenIds, bool vote) private {
    uint256 voteChanges;

    for (uint256 i; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];

      if (proposalVotes[proposalId][tokenId] != vote) {
        proposalVotes[proposalId][tokenId] = vote;
        voteChanges++;
      }
    }

    if (vote) {
      proposals[proposalId].totalVotes += voteChanges;
    } else {
      proposals[proposalId].totalVotes -= voteChanges;
    }
  }

  function execute(
    address target,
    uint256 value,
    bytes memory calldata_
  ) public payable returns (uint256) {
    uint256 proposalId = hashProposal(target, value, calldata_);

    Proposal storage proposal = proposals[proposalId];

    require(!proposal.executed, "Proposal has already been executed");
    require(
      proposal.totalVotes >= (proposal.maxVotes/2 + 1),
      "Insufficient votes to execute proposal"
    );

    proposal.executed = true;

    (bool success, bytes memory returndata) = target.call{value: value}(calldata_);
    Address.verifyCallResult(success, returndata, "Proposal execution reverted");

    return proposalId;
  }

  function cardinalExecute(
    address target,
    uint256 value,
    bytes memory calldata_
  ) public payable {
    require(msg.sender == cardinal);
    (bool success, bytes memory returndata) = target.call{value: value}(calldata_);
    Address.verifyCallResult(success, returndata, "Proposal execution reverted");
  }

  function electCardinal(address _cardinal) public {
    require(address(this) == msg.sender, 'Caller must equal this contract');
    cardinal = _cardinal;
  }


  function onERC721Received(address, address, uint256, bytes calldata) external pure returns(bytes4) {
    return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
  }

  receive() external payable {}
  fallback() external payable {}
}