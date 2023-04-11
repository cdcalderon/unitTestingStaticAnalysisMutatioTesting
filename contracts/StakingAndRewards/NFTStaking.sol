// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./StakingERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NFTStaking
 * @dev This contract allows staking an NFT and earning rewards in ERC20 tokens.
 */
contract NFTStaking is IERC721Receiver, ReentrancyGuard {
    StakingERC20 public erc20Token;
    IERC721 public erc721Token;
    uint256 public constant REWARD_AMOUNT = 10 * (10 ** 18);
    uint256 public constant REWARD_INTERVAL = 24 hours;

    struct StakeInfo {
        address owner;
        uint256 lastClaimed;
    }

    mapping(uint256 => StakeInfo) public stakers;

    constructor(address _erc20Token, address _erc721Token) {
        erc20Token = StakingERC20(_erc20Token);
        erc721Token = IERC721(_erc721Token);
    }

    /**
     * @dev Receives an ERC721 token, adds the staker to the mapping and marks the current time as the last claimed time.
     */
    function onERC721Received(
        address /* operator */,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        require(msg.sender == address(erc721Token), "Invalid token");

        stakers[tokenId] = StakeInfo(from, block.timestamp);

        return this.onERC721Received.selector;
    }

    /**
     * @dev Claims the reward for staking an NFT.
     *      The reward can only be claimed if the caller is the owner of the staked NFT and if the claim interval has passed.
     */
    function claimRewards(uint256 tokenId) external nonReentrant {
        StakeInfo storage stake = stakers[tokenId];
        require(stake.owner == msg.sender, "Not owner of the staked NFT");
        require(
            stake.lastClaimed + REWARD_INTERVAL <= block.timestamp,
            "Claim interval not met"
        );

        stake.lastClaimed += REWARD_INTERVAL;
        erc20Token.transfer(msg.sender, REWARD_AMOUNT);
    }

    /**
     * @dev Unstakes an NFT and transfers it back to the owner.
     *      The staker will lose any accrued rewards if they unstake early.
     */
    function unstake(uint256 tokenId) external nonReentrant {
        StakeInfo storage stake = stakers[tokenId];
        require(stake.owner == msg.sender, "Not owner of the staked NFT");

        delete stakers[tokenId];

        erc721Token.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /**
     * @dev Mints ERC20 tokens to the caller.
     */
    function mintERC20(uint256 amount) external {
        erc20Token.mint(msg.sender, amount);
    }
}
