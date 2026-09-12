// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface INAVOracle {
    struct NAVData {
        uint256 value;
        uint256 updatedAt;
    }

    function getNAV(uint256 assetId)
        external
        view
        returns (NAVData memory);

    function hasNAV(uint256 assetId)
        external
        view
        returns (bool);
}