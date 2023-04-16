const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("NFTStakingV2", () => {
  let nftStaking;
  let stakingERC20;
  let stakingERC721;
  let owner;
  let user;
  const TOKEN_ID = 0;
  const SECONDS_IN_A_DAY = 60 * 60 * 24;
  const initialSupply = ethers.utils.parseEther("1000000");

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    const StakingERC721 = await ethers.getContractFactory("StakingERC721");
    stakingERC721 = await StakingERC721.deploy();
    await stakingERC721.deployed();

    const StakingERC20 = await ethers.getContractFactory("StakingERC20");
    stakingERC20 = await StakingERC20.deploy(initialSupply);
    await stakingERC20.deployed();

    const NFTStaking = await ethers.getContractFactory("NFTStakingV2");
    nftStaking = await NFTStaking.deploy(
      stakingERC721.address,
      stakingERC20.address
    );
    await nftStaking.deployed();

    await stakingERC20.transferOwnership(nftStaking.address);
  });

  describe("Deployment", () => {
    it("should initialize StakingERC20 correctly", async () => {
      const stakeCoinAddress = await nftStaking.erc20Token();
      expect(stakeCoinAddress).to.not.be.equal(ethers.constants.AddressZero);
    });
    it("should set the NFT address properly", async () => {
      expect(await nftStaking.erc721Token()).to.be.equal(stakingERC721.address);
    });
  });

  describe("NFT Staking", () => {
    it("should revert when attempting to stake a non-MNFT NFT", async () => {
      const stakingERC721MNFT = await ethers.getContractFactory(
        "StakingERC721"
      );
      const stakingERC721 = await stakingERC721MNFT.deploy();
      const expectedTokenId = 0;
      await stakingERC721.deployed();

      await stakingERC721.mintNFT(owner.address);

      await expect(
        stakingERC721["safeTransferFrom(address,address,uint256)"](
          owner.address,
          nftStaking.address,
          expectedTokenId
        )
      ).to.be.revertedWith("NFTStaking: must send MNFT only");
    });

    it("should successfully stake NFT and update state variables", async () => {
      await stakingERC721.mintNFT(owner.address);

      await expect(
        stakingERC721["safeTransferFrom(address,address,uint256)"](
          owner.address,
          nftStaking.address,
          TOKEN_ID
        )
      ).to.not.be.reverted;

      const currentTime = await time.latest();
      expect(
        await nftStaking.lastRewardClaimTime(TOKEN_ID)
      ).to.be.approximately(currentTime, 5);
      expect(await nftStaking.tokenStaker(TOKEN_ID)).to.be.equal(owner.address);
    });
  });

  describe("Claim rewards and Unstaking", () => {
    let lastRewardClaimTime;
    beforeEach(async () => {
      await stakingERC721.mintNFT(owner.address);

      stakingERC721["safeTransferFrom(address,address,uint256)"](
        owner.address,
        nftStaking.address,
        TOKEN_ID
      );
      lastRewardClaimTime = await nftStaking.lastRewardClaimTime(TOKEN_ID);
    });
    describe("Claiming rewards", () => {
      it("should prevent non-stakers from claiming rewards", async () => {
        await expect(
          nftStaking.connect(user).claimRewards(TOKEN_ID)
        ).to.be.revertedWith("NFTStaking: caller is not the staker");
      });

      it("should disallow reward claims within 24 hours of staking", async () => {
        await expect(nftStaking.claimRewards(TOKEN_ID))
          .to.be.revertedWithCustomError(nftStaking, "StakingClaimError")
          .withArgs(lastRewardClaimTime.toNumber() + SECONDS_IN_A_DAY);
      });

      it("should return 0 reward and next claim time for unstaked NFTs", async () => {
        const { rewardAmount, nextEligibleClaimTime } =
          await nftStaking.calculateReward(TOKEN_ID + 1);
        expect(rewardAmount).to.be.equal(0);
        expect(nextEligibleClaimTime).to.be.equal(0);
      });

      it("should allow stakers to claim 20 tokens after 48 hours", async () => {
        await time.increase(SECONDS_IN_A_DAY * 2);

        await expect(nftStaking.claimRewards(TOKEN_ID)).to.changeTokenBalance(
          stakingERC20,
          owner.address,
          ethers.utils.parseEther("20")
        );

        expect(
          await nftStaking.lastRewardClaimTime(TOKEN_ID)
        ).to.be.approximately(await time.latest(), 5);
      });
    });
    describe("Unstaking NFT", () => {
      it("should disallow non-stakers from withdrawing NFTs", async () => {
        await expect(
          nftStaking.connect(user).unstake(TOKEN_ID)
        ).to.be.revertedWith("NFTStaking: caller is not the staker");
      });

      it("should permit stakers to unstake NFTs with rewards", async () => {
        await time.increase(SECONDS_IN_A_DAY * 10);

        await expect(nftStaking.unstake(TOKEN_ID)).to.changeTokenBalance(
          stakingERC20,
          owner.address,
          ethers.utils.parseEther("100")
        );

        expect(await nftStaking.tokenStaker(TOKEN_ID)).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(await nftStaking.lastRewardClaimTime(TOKEN_ID)).to.be.equal(0);

        expect(await stakingERC721.ownerOf(TOKEN_ID)).to.be.equal(
          owner.address
        );
      });

      it("should allow stakers to unstake their NFT without reward", async () => {
        await expect(nftStaking.unstake(TOKEN_ID)).to.changeTokenBalance(
          stakingERC20,
          owner.address,
          0
        );

        expect(await nftStaking.tokenStaker(TOKEN_ID)).to.be.equal(
          ethers.constants.AddressZero
        );
        expect(await nftStaking.lastRewardClaimTime(TOKEN_ID)).to.be.equal(0);

        expect(await stakingERC721.ownerOf(TOKEN_ID)).to.be.equal(
          owner.address
        );
      });
    });
  });
});
