// SPDX-License-Identifier: MIT

/*
  _______ _    _ ______
 |__   __| |  | |  ____|
    | |  | |__| | |__
    | |  |  __  |  __|
    | |  | |  | | |____
   _|_|_ |_|  |_|______|____   _____ _    _
  / ____| |  | | |  | |  __ \ / ____| |  | |
 | |    | |__| | |  | | |__) | |    | |__| |
 | |    |  __  | |  | |  _  /| |    |  __  |
 | |____| |  | | |__| | | \ \| |____| |  | |
  \_____|_|__|_|\____/|_|  \_\\_____|_|  |_|
  / __ \|  ____|
 | |  | | |__
 | |  | |  __|
 | |__| | |
  \____/|_|   _ ______          __ __     __
  / ____| |  | |  _ \ \        / /\\ \   / /
 | (___ | |  | | |_) \ \  /\  / /  \\ \_/ /
  \___ \| |  | |  _ < \ \/  \/ / /\ \\   /
  ____) | |__| | |_) | \  /\  / ____ \| |
 |_____/ \____/|____/_ _\/  \/_/____\_\_|
      | |  ____|/ ____| |  | |/ ____|
      | | |__  | (___ | |  | | (___
  _   | |  __|  \___ \| |  | |\___ \
 | |__| | |____ ____) | |__| |____) |
  \____/|______|_____/_\____/|_____/_      ______ _______ _____
 |  __ \ /\   |  \/  |  __ \| |  | | |    |  ____|__   __/ ____|
 | |__) /  \  | \  / | |__) | |__| | |    | |__     | | | (___
 |  ___/ /\ \ | |\/| |  ___/|  __  | |    |  __|    | |  \___ \
 | |  / ____ \| |  | | |    | |  | | |____| |____   | |  ____) |
 |_| /_/    \_\_|  |_|_|    |_|  |_|______|______|  |_| |_____/

Contract by steviep.eth





*/

pragma solidity ^0.8.11;

import "./SubwayJesusPamphlets.sol";

contract SigVotingPOC {
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

  function hashVote(
    uint256 proposalId,
    uint256 tokenId,
    bool vote,
    uint256 useByTimeStamp
  ) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(proposalId, tokenId, vote, useByTimeStamp));
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
    uint256[] calldata tokenIds,
    bool[] calldata votes,
    uint256[] calldata useByTimeStamps,
    bytes[] calldata signatures
  ) public {
    require(tokenIds.length == signatures.length);
    require(votes.length == signatures.length);
    require(useByTimeStamps.length == signatures.length);

    for (uint256 i; i < votes.length; i++) {
      uint256 tokenId = tokenIds[i];
      bool vote = votes[i];

      verifySignature(proposalId, tokenId, vote, useByTimeStamps[i], signatures[i]);
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

  function verifySignature(
    uint256 proposalId,
    uint256 tokenId,
    bool vote,
    uint256 useByTimeStamp,
    bytes calldata signature
  ) public view returns (address) {
    bytes32 messageHash = keccak256(abi.encodePacked(
      "\x19Ethereum Signed Message:\n32",
      hashVote(proposalId, tokenId, vote, useByTimeStamp)
    ));

    address signer = recoverSigner(messageHash, signature);

    require(useByTimeStamp > block.timestamp, 'Vote has expired');
    require(baseContract.ownerOf(tokenId) == signer, 'Token must be owned by signer');

    return signer;
  }


  function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address) {
    require(signature.length == 65, "invalid signature length");
    bytes32 r;
    bytes32 s;
    uint8 v;
    assembly {
      r := mload(add(signature, 32))
      s := mload(add(signature, 64))
      v := byte(0, mload(add(signature, 96)))
    }
    return ecrecover(messageHash, v, r, s);
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

  function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
    return this.onERC1155BatchReceived.selector;
  }









  receive() external payable {}
  fallback() external payable {}
}