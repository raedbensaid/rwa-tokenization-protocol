// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AssetRegistry is Ownable {
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

    uint256 private _nextAssetId = 1;

    mapping(uint256 => Asset) private _assets;

    event AssetRegistered(
        uint256 indexed assetId,
        string name,
        string symbol,
        address indexed issuer,
        uint256 totalValue
    );

    event AssetUpdated(
        uint256 indexed assetId,
        string metadataURI,
        uint256 totalValue
    );

    event AssetStatusChanged(
        uint256 indexed assetId,
        bool active
    );

    event AssetTokenLinked(
        uint256 indexed assetId,
        address indexed tokenAddress
    );

    error AssetNotFound(uint256 assetId);
    error AssetAlreadyInactive(uint256 assetId);
    error InvalidIssuer();
    error InvalidName();
    error InvalidSymbol();
    error InvalidValue();
    error InvalidTokenAddress();

    constructor(address initialOwner)
        Ownable(initialOwner)
    {}

    function registerAsset(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI,
        address issuer,
        uint256 totalValue
    ) external onlyOwner returns (uint256 assetId) {
        if (bytes(name).length == 0) {
            revert InvalidName();
        }

        if (bytes(symbol).length == 0) {
            revert InvalidSymbol();
        }

        if (issuer == address(0)) {
            revert InvalidIssuer();
        }

        if (totalValue == 0) {
            revert InvalidValue();
        }

        assetId = _nextAssetId++;

        _assets[assetId] = Asset({
            id: assetId,
            name: name,
            symbol: symbol,
            metadataURI: metadataURI,
            issuer: issuer,
            totalValue: totalValue,
            tokenAddress: address(0),
            createdAt: block.timestamp,
            active: true
        });

        emit AssetRegistered(
            assetId,
            name,
            symbol,
            issuer,
            totalValue
        );
    }

    function updateAsset(
        uint256 assetId,
        string calldata metadataURI,
        uint256 totalValue
    ) external onlyOwner {
        Asset storage asset = _getAsset(assetId);

        if (totalValue == 0) {
            revert InvalidValue();
        }

        asset.metadataURI = metadataURI;
        asset.totalValue = totalValue;

        emit AssetUpdated(
            assetId,
            metadataURI,
            totalValue
        );
    }

    function deactivateAsset(
        uint256 assetId
    ) external onlyOwner {
        Asset storage asset = _getAsset(assetId);

        if (!asset.active) {
            revert AssetAlreadyInactive(assetId);
        }

        asset.active = false;

        emit AssetStatusChanged(assetId, false);
    }

    function activateAsset(
        uint256 assetId
    ) external onlyOwner {
        Asset storage asset = _getAsset(assetId);

        asset.active = true;

        emit AssetStatusChanged(assetId, true);
    }

    function linkToken(
        uint256 assetId,
        address tokenAddress
    ) external onlyOwner {
        Asset storage asset = _getAsset(assetId);

        if (tokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }

        asset.tokenAddress = tokenAddress;

        emit AssetTokenLinked(
            assetId,
            tokenAddress
        );
    }

    function getAsset(
        uint256 assetId
    ) external view returns (Asset memory) {
        return _getAsset(assetId);
    }

    function assetExists(
        uint256 assetId
    ) public view returns (bool) {
        return assetId > 0 && assetId < _nextAssetId;
    }

    function nextAssetId()
        external
        view
        returns (uint256)
    {
        return _nextAssetId;
    }

    function _getAsset(
        uint256 assetId
    ) internal view returns (Asset storage) {
        if (!assetExists(assetId)) {
            revert AssetNotFound(assetId);
        }

        return _assets[assetId];
    }
}