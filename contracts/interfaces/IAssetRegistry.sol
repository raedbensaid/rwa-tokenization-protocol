// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IAssetRegistry {
    struct Asset {
        uint256 id;
        string name;
        string symbol;
        string metadataURI;
        address issuer;
        uint256 totalValue;
        address tokenAddress;
        uint256 createdAt;
        bool active;
    }

    function assetExists(uint256 assetId)
        external
        view
        returns (bool);

    function getAsset(uint256 assetId)
        external
        view
        returns (Asset memory);
}