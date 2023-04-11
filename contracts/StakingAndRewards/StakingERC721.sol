// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract StakingERC721 is ERC721 {
    uint256 private tokenIdCounter;

    constructor() ERC721("StakingERC721", "MNFT") {}

    function mintNFT(address to) external {
        _safeMint(to, tokenIdCounter);
        tokenIdCounter++;
    }

    function currentTokenId() public view returns (uint256) {
        return tokenIdCounter;
    }
}
