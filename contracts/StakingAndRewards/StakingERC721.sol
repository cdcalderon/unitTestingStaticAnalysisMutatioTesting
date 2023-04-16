// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingERC721 is ERC721, Ownable {
    uint256 private tokenIdCounter;

    constructor() ERC721("StakingERC721", "MNFT") {}

    function mintNFT(address to) public onlyOwner {
        _safeMint(to, tokenIdCounter);
        tokenIdCounter++;
    }

    function currentTokenId() public view returns (uint256) {
        return tokenIdCounter;
    }
}
