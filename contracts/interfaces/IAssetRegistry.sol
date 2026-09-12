// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IAssetRegistry {
    function assetExists(uint256 assetId)
        external
        view
        returns (bool);
}