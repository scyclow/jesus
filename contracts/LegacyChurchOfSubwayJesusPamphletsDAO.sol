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

pragma solidity ^0.8.2;

interface IChurchOfSubwayJesusPamphlets {
  function ownerOf(uint256 tokenId) external returns (address owner);
}

// contract ChurchOfSubwayJesusPamphletsDAO  {
//   IChurchOfSubwayJesusPamphlets public baseContract;

//   struct ProposalCore {
//     Timers.BlockNumber voteStart;
//     Timers.BlockNumber voteEnd;
//     bool executed;
//     bool canceled;
//   }

//   mapping(uint256 => ProposalCore) private _proposals;

//   event ProposalCreated(
//     uint256 proposalId,
//     address proposer,
//     address[] targets,
//     uint256[] values,
//     string[] signatures,
//     bytes[] calldatas,
//     uint256 startBlock,
//     uint256 endBlock,
//     string description
//   );

//   constructor(address _baseContractAddr) {
//     baseContract = IChurchOfSubwayJesusPamphlets(_baseContractAddr);
//   }



//   *
//    * @dev See {IGovernor-hashProposal}.
//    *
//    * The proposal id is produced by hashing the RLC encoded `targets` array, the `values` array, the `calldatas` array
//    * and the descriptionHash (bytes32 which itself is the keccak256 hash of the description string). This proposal id
//    * can be produced from the proposal data which is part of the {ProposalCreated} event. It can even be computed in
//    * advance, before the proposal is submitted.
//    *
//    * Note that the chainId and the governor address are not part of the proposal id computation. Consequently, the
//    * same proposal (with same operation and same description) will have the same id if submitted on multiple governors
//    * accross multiple networks. This also means that in order to execute the same operation twice (on the same
//    * governor) the proposer will have to change the description in order to avoid proposal id conflicts.

//   function hashProposal(
//     address[] memory targets,
//     uint256[] memory values,
//     bytes[] memory calldatas,
//     bytes32 descriptionHash
//   ) public pure virtual override returns (uint256) {
//     return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
//   }

//   function propose(
//     address[] memory targets,
//     uint256[] memory values,
//     bytes[] memory calldatas,
//     string memory description
//   ) public virtual override returns (uint256) {
//     require(
//       getVotes(msg.sender, block.number - 1) >= proposalThreshold(),
//       "GovernorCompatibilityBravo: proposer votes below proposal threshold"
//     );

//     uint256 proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

//     require(targets.length == values.length, "Governor: invalid proposal length");
//     require(targets.length == calldatas.length, "Governor: invalid proposal length");
//     require(targets.length > 0, "Governor: empty proposal");

//     ProposalCore storage proposal = _proposals[proposalId];
//     require(proposal.voteStart.isUnset(), "Governor: proposal already exists");

//     uint64 snapshot = block.number.toUint64() + votingDelay().toUint64();
//     uint64 deadline = snapshot + votingPeriod().toUint64();

//     proposal.voteStart.setDeadline(snapshot);
//     proposal.voteEnd.setDeadline(deadline);

//     emit ProposalCreated(
//       proposalId,
//       _msgSender(),
//       targets,
//       values,
//       new string[](targets.length),
//       calldatas,
//       snapshot,
//       deadline,
//       description
//     );

//     return proposalId;
//   }

//     function _castVote(
//       uint256 proposalId,
//       address account,
//       uint8 support,
//       string memory reason
//     ) internal virtual returns (uint256) {
//       ProposalCore storage proposal = _proposals[proposalId];
//       require(state(proposalId) == ProposalState.Active, "Governor: vote not currently active");

//       uint256 weight = getVotes(account, proposal.voteStart.getDeadline());
//       _countVote(proposalId, account, support, weight);

//       emit VoteCast(account, proposalId, support, weight, reason);

//       return weight;
//     }

// }