// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IAssetToken {
    function balanceOf(address account)
        external
        view
        returns (uint256);

    function totalSupply()
        external
        view
        returns (uint256);

    function burn(
        address from,
        uint256 amount
    )
        external;
}