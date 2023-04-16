// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingERC20 is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("StakingERC20", "MTK") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }
}
