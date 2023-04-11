const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingERC20", function () {
  let StakingERC20;
  let stakingERC20;
  let deployer;
  let addr1;
  let addr2;
  const initialSupply = ethers.utils.parseEther("1000");

  beforeEach(async function () {
    StakingERC20 = await ethers.getContractFactory("StakingERC20");
    [deployer, addr1, addr2, _] = await ethers.getSigners();
    stakingERC20 = await StakingERC20.deploy(initialSupply);
  });

  describe("Deployment", function () {
    it("Should have the correct token name", async function () {
      expect(await stakingERC20.name()).to.equal("StakingERC20");
    });

    it("Should have the correct token symbol", async function () {
      expect(await stakingERC20.symbol()).to.equal("MTK");
    });

    it("Should assign the total supply to the deployer", async function () {
      const deployerBalance = await stakingERC20.balanceOf(deployer.address);
      expect(await stakingERC20.totalSupply()).to.equal(deployerBalance);
    });

    it("Should have the correct initial supply", async function () {
      expect(await stakingERC20.totalSupply()).to.equal(initialSupply);
    });
  });

  describe("Minting tokens", function () {
    it("Should mint tokens to the specified address", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      await stakingERC20.mint(addr1.address, mintAmount);
      expect(await stakingERC20.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should increase the total supply when minting", async function () {
      const mintAmount = ethers.utils.parseEther("100");
      await stakingERC20.mint(addr1.address, mintAmount);
      expect(await stakingERC20.totalSupply()).to.equal(
        initialSupply.add(mintAmount)
      );
    });
  });

  describe("Transferring tokens", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      await stakingERC20.transfer(addr1.address, transferAmount);
      expect(await stakingERC20.balanceOf(deployer.address)).to.equal(
        initialSupply.sub(transferAmount)
      );
      expect(await stakingERC20.balanceOf(addr1.address)).to.equal(
        transferAmount
      );
    });

    it("Should fail when trying to transfer more tokens than the sender has", async function () {
      const transferAmount = ethers.utils.parseEther("1001");
      await expect(
        stakingERC20.transfer(addr1.address, transferAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});
