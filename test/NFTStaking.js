const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStaking", function () {
  let deployer, addr1, addr2;
  let StakingERC20, StakingERC721, NFTStaking;
  let stakingERC20, stakingERC721, nftStaking;
  const initialSupply = ethers.utils.parseUnits("1000000", 18);
  const REWARD_INTERVAL = 60 * 60 * 24; // 24 hours in seconds
  const REWARD_AMOUNT = ethers.utils.parseEther("10"); // 10 tokens
  const INITIAL_CONTRACT_BALANCE = ethers.utils.parseEther("1000"); // 1000 tokens
  //const tokenId = 1; // Token ID

  beforeEach(async function () {
    StakingERC20 = await ethers.getContractFactory("StakingERC20");
    stakingERC20 = await StakingERC20.deploy(initialSupply);
    await stakingERC20.deployed();

    StakingERC721 = await ethers.getContractFactory("StakingERC721");
    stakingERC721 = await StakingERC721.deploy();
    await stakingERC721.deployed();

    NFTStaking = await ethers.getContractFactory("NFTStaking");
    nftStaking = await NFTStaking.deploy(
      stakingERC20.address,
      stakingERC721.address
    );
    await nftStaking.deployed();

    [addr1, addr2, ...addrs] = await ethers.getSigners();

    await stakingERC20
      .connect(addr1)
      .mint(addr1.address, INITIAL_CONTRACT_BALANCE);
    await stakingERC20
      .connect(addr1)
      .approve(nftStaking.address, INITIAL_CONTRACT_BALANCE);
    await stakingERC20
      .connect(addr1)
      .transfer(nftStaking.address, INITIAL_CONTRACT_BALANCE);
  });

  describe("Deployment", function () {
    it("Should set the right ERC20 token", async function () {
      expect(await nftStaking.erc20Token()).to.equal(stakingERC20.address);
    });

    it("Should set the right ERC721 token", async function () {
      expect(await nftStaking.erc721Token()).to.equal(stakingERC721.address);
    });
  });

  describe("Staking and rewards", function () {
    beforeEach(async function () {
      await stakingERC20.mint(addr1.address, "1000000000000000000000"); // 1000 tokens
      await stakingERC20
        .connect(addr1)
        .approve(nftStaking.address, "1000000000000000000000"); // 1000 tokens
      await stakingERC721.connect(addr1).mintNFT(addr1.address);
      tokenId = (await stakingERC721.currentTokenId()).sub(1); // Get the current token ID
    });

    it("Should stake NFT and update stakers mapping", async function () {
      await stakingERC721
        .connect(addr1)
        ["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nftStaking.address,
          tokenId
        );

      const stake = await nftStaking.stakers(0);
      expect(stake.owner).to.equal(addr1.address);
    });

    it("Should claim rewards", async function () {
      await stakingERC721.connect(addr1).mintNFT(addr1.address);
      await stakingERC721
        .connect(addr1)
        ["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nftStaking.address,
          tokenId
        );
      await ethers.provider.send("evm_increaseTime", [REWARD_INTERVAL]);
      await ethers.provider.send("evm_mine");
      const initialBalance = await stakingERC20.balanceOf(addr1.address);
      await nftStaking.connect(addr1).claimRewards(tokenId);
      const newBalance = await stakingERC20.balanceOf(addr1.address);
      expect(newBalance.sub(initialBalance)).to.equal(REWARD_AMOUNT);
    });

    it("Should not allow claiming rewards too soon", async function () {
      await stakingERC721
        .connect(addr1)
        ["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nftStaking.address,
          tokenId
        );

      await expect(
        nftStaking.connect(addr1).claimRewards(tokenId)
      ).to.be.revertedWith("Claim interval not met");
    });

    it("Should unstake NFT and remove from stakers mapping", async function () {
      await stakingERC721.connect(addr1).mintNFT(addr1.address);
      await stakingERC721
        .connect(addr1)
        ["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nftStaking.address,
          tokenId
        );

      await nftStaking.connect(addr1).unstake(0);

      expect(await stakingERC721.ownerOf(0)).to.equal(addr1.address);

      // Check for a zero address in the owner field instead of expecting a revert
      const stake = await nftStaking.stakers(0);
      expect(stake.owner).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });

    it("Should not allow claiming rewards after unstaking", async function () {
      await stakingERC721
        .connect(addr1)
        ["safeTransferFrom(address,address,uint256)"](
          addr1.address,
          nftStaking.address,
          tokenId
        );

      await nftStaking.connect(addr1).unstake(0);

      await expect(
        nftStaking.connect(addr1).claimRewards(0)
      ).to.be.revertedWith("Not owner of the staked NFT");
    });
  });
});