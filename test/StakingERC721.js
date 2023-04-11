const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingERC721", function () {
  let StakingERC721, stakingERC721, deployer, addr1;

  beforeEach(async function () {
    StakingERC721 = await ethers.getContractFactory("StakingERC721");
    [deployer, addr1] = await ethers.getSigners();
    stakingERC721 = await StakingERC721.deploy();
    await stakingERC721.deployed();
  });

  describe("Deployment", function () {
    it("Should have the correct token name", async function () {
      expect(await stakingERC721.name()).to.equal("StakingERC721");
    });

    it("Should have the correct token symbol", async function () {
      expect(await stakingERC721.symbol()).to.equal("MNFT");
    });
  });

  describe("Minting NFTs", function () {
    it("Should mint a new NFT", async function () {
      await stakingERC721.mintNFT(addr1.address);
      expect(await stakingERC721.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should increase the tokenId counter", async function () {
      await stakingERC721.mintNFT(addr1.address);
      await stakingERC721.mintNFT(addr1.address);
      expect(await stakingERC721.ownerOf(1)).to.equal(addr1.address);
    });
  });

  describe("Transferring NFTs", function () {
    it("Should transfer an NFT to another address", async function () {
      await stakingERC721.mintNFT(addr1.address);
      await stakingERC721
        .connect(addr1)
        .transferFrom(addr1.address, deployer.address, 0);
      expect(await stakingERC721.ownerOf(0)).to.equal(deployer.address);
    });

    it("Should not allow transferring NFTs not owned", async function () {
      await stakingERC721.mintNFT(addr1.address);
      await expect(
        stakingERC721.transferFrom(deployer.address, addr1.address, 0)
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");
    });
  });
});
