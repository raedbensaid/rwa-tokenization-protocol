// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IComplianceRegistry {
    function isApproved(address investor)
        external
        view
        returns (bool);
}