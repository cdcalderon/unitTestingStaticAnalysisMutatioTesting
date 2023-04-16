// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./StakingERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";

error StakingClaimError(uint256 nextClaimTime);

/**
 * @title NFTStakingV2
 * @dev This contract allows staking an NFT and earning rewards in ERC20 tokens.
 */
contract NFTStakingV2 is IERC721Receiver {
    StakingERC20 public immutable erc20Token;
    IERC721 public immutable erc721Token;
    uint256 private constant CLAIM_REWARD = 10;
    uint256 private constant CLAIM_INTERVAL = 24 hours;

    mapping(uint256 => uint256) public lastRewardClaimTime;
    mapping(uint256 => address) public tokenStaker;

    /// @notice Initializes the NFTStakingV2 contract with the ERC721 and ERC20 tokens.
    /// @param _erc721Token The address of the ERC721 token to be staked.
    /// @param _erc20Token The address of the ERC20 token to be rewarded.
    constructor(IERC721 _erc721Token, address _erc20Token) {
        erc20Token = StakingERC20(_erc20Token);
        erc721Token = _erc721Token;
    }

    /// @notice Modifier to restrict function access to the staker of a token.
    modifier onlyTokenStaker(uint256 tokenId) {
        require(
            tokenStaker[tokenId] == msg.sender,
            "NFTStaking: caller is not the staker"
        );
        _;
    }

    /// @notice ERC721 receiver function.
    /// @param operator The address of the operator.
    /// @param from The address from which the token was sent.
    /// @param tokenId The ID of the token being sent.
    /// @param data Additional calldata.
    /// @return A bytes4 selector indicating the function executed successfully.
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        require(
            msg.sender == address(erc721Token),
            "NFTStaking: must send MNFT only"
        );

        lastRewardClaimTime[tokenId] = block.timestamp;
        tokenStaker[tokenId] = from;

        return IERC721Receiver.onERC721Received.selector;
    }

    /// @notice Calculates the reward and next claim time for a staked token.
    /// @param tokenId The ID of the staked token.
    /// @return rewardAmount The reward amount in ERC20 tokens.
    /// @return nextEligibleClaimTime The next time the reward can be claimed.
    function calculateReward(
        uint256 tokenId
    )
        public
        view
        returns (uint256 rewardAmount, uint256 nextEligibleClaimTime)
    {
        uint256 lastTime = lastRewardClaimTime[tokenId];
        if (lastTime == 0) return (0, 0);
        uint256 _now = block.timestamp;

        uint256 claimTimes = (_now - lastTime) / CLAIM_INTERVAL;

        if (claimTimes == 0) return (0, lastTime + CLAIM_INTERVAL);

        rewardAmount = claimTimes * CLAIM_REWARD * 10 ** erc20Token.decimals();
        nextEligibleClaimTime = 0;
    }

    /// @notice Claims the ERC20 token rewards for a staked token.
    /// @param tokenId The ID of the staked token.
    function claimRewards(uint256 tokenId) external onlyTokenStaker(tokenId) {
        (uint256 claimReward, uint256 nextClaimTime) = calculateReward(tokenId);

        if (claimReward == 0) revert StakingClaimError(nextClaimTime);

        lastRewardClaimTime[tokenId] = block.timestamp;

        erc20Token.mint(msg.sender, claimReward);
    }

    /// @notice Unstakes a token, claiming any pending rewards, and returns it to the owner.
    /// @param tokenId The ID of the staked token.
    function unstake(uint256 tokenId) external onlyTokenStaker(tokenId) {
        (uint256 claimReward, ) = calculateReward(tokenId);
        if (claimReward != 0) erc20Token.mint(msg.sender, claimReward);

        tokenStaker[tokenId] = address(0);
        lastRewardClaimTime[tokenId] = 0;

        erc721Token.transferFrom(address(this), msg.sender, tokenId);
    }
}
