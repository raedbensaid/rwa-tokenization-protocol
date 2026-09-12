// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

contract NAVOracle is AccessControl {
    bytes32 public constant NAV_UPDATER_ROLE =
        keccak256("NAV_UPDATER_ROLE");

    struct NAVData {
        uint256 value;
        uint256 updatedAt;
    }

    address public immutable assetRegistry;

    mapping(uint256 => NAVData) private _navs;

    event NAVUpdated(
        uint256 indexed assetId,
        uint256 value,
        uint256 updatedAt,
        address indexed updater
    );

    error InvalidAdmin();
    error InvalidAssetRegistry();
    error InvalidAsset();
    error InvalidNAV();
    error NAVNotAvailable();

    constructor(
        address initialAdmin,
        address assetRegistry_
    ) {
        if (initialAdmin == address(0)) {
            revert InvalidAdmin();
        }

        if (assetRegistry_ == address(0)) {
            revert InvalidAssetRegistry();
        }

        assetRegistry = assetRegistry_;

        _grantRole(
            DEFAULT_ADMIN_ROLE,
            initialAdmin
        );

        _grantRole(
            NAV_UPDATER_ROLE,
            initialAdmin
        );

        _setRoleAdmin(
            NAV_UPDATER_ROLE,
            DEFAULT_ADMIN_ROLE
        );
    }

    function setNAV(
        uint256 assetId,
        uint256 value
    )
        external
        onlyRole(NAV_UPDATER_ROLE)
    {
        if (assetId == 0) {
            revert InvalidAsset();
        }

        if (
            !IAssetRegistry(assetRegistry)
                .assetExists(assetId)
        ) {
            revert InvalidAsset();
        }

        if (value == 0) {
            revert InvalidNAV();
        }

        _navs[assetId] = NAVData({
            value: value,
            updatedAt: block.timestamp
        });

        emit NAVUpdated(
            assetId,
            value,
            block.timestamp,
            msg.sender
        );
    }

    function getNAV(
        uint256 assetId
    )
        external
        view
        returns (NAVData memory)
    {
        if (assetId == 0) {
            revert InvalidAsset();
        }

        if (
            _navs[assetId].updatedAt == 0
        ) {
            revert NAVNotAvailable();
        }

        return _navs[assetId];
    }

    function hasNAV(
        uint256 assetId
    )
        external
        view
        returns (bool)
    {
        return _navs[assetId].updatedAt != 0;
    }
}