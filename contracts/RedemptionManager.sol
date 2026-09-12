// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";
import {IAssetToken} from "./interfaces/IAssetToken.sol";
import {INAVOracle} from "./interfaces/INAVOracle.sol";
import {IComplianceRegistry} from "./interfaces/IComplianceRegistry.sol";

contract RedemptionManager {
    struct Redemption {
        uint256 id;
        uint256 assetId;
        address investor;
        uint256 tokenAmount;
        uint256 nav;
        uint256 redemptionValue;
        uint256 timestamp;
    }

    IAssetRegistry public immutable assetRegistry;
    INAVOracle public immutable navOracle;
    IComplianceRegistry public immutable complianceRegistry;

    uint256 private _nextRedemptionId = 1;

    mapping(uint256 => Redemption)
        private _redemptions;

    mapping(address => uint256[])
        private _investorRedemptions;

    event RedemptionExecuted(
        uint256 indexed redemptionId,
        uint256 indexed assetId,
        address indexed investor,
        uint256 tokenAmount,
        uint256 nav,
        uint256 redemptionValue
    );

    error InvalidAsset();
    error AssetTokenNotLinked();
    error InvalidInvestor();
    error InvestorNotCompliant();
    error InvalidAmount();
    error NAVUnavailable();
    error InvalidSupply();
    error RedemptionValueTooSmall();

    constructor(
        address assetRegistry_,
        address navOracle_,
        address complianceRegistry_
    ) {
        if (assetRegistry_ == address(0)) {
            revert InvalidAsset();
        }

        if (navOracle_ == address(0)) {
            revert NAVUnavailable();
        }

        if (complianceRegistry_ == address(0)) {
            revert InvalidInvestor();
        }

        assetRegistry =
            IAssetRegistry(assetRegistry_);

        navOracle =
            INAVOracle(navOracle_);

        complianceRegistry =
            IComplianceRegistry(
                complianceRegistry_
            );
    }

    function redeem(
    uint256 assetId,
    uint256 tokenAmount
)
    external
    returns (
        uint256 redemptionId,
        uint256 redemptionValue
    )
{
    if (
        assetId == 0 ||
        !assetRegistry.assetExists(assetId)
    ) {
        revert InvalidAsset();
    }

    if (tokenAmount == 0) {
        revert InvalidAmount();
    }

    if (
        !complianceRegistry.isApproved(msg.sender)
    ) {
        revert InvestorNotCompliant();
    }

    IAssetRegistry.Asset memory asset =
        assetRegistry.getAsset(assetId);

    address tokenAddress = asset.tokenAddress;

    if (!asset.active) {
        revert InvalidAsset();
    }

    if (tokenAddress == address(0)) {
        revert AssetTokenNotLinked();
    }

    if (!navOracle.hasNAV(assetId)) {
        revert NAVUnavailable();
    }

    INAVOracle.NAVData memory navData =
        navOracle.getNAV(assetId);

    IAssetToken token =
        IAssetToken(tokenAddress);

    uint256 totalSupply =
        token.totalSupply();

    if (totalSupply == 0) {
        revert InvalidSupply();
    }

    uint256 investorBalance =
        token.balanceOf(msg.sender);

    if (investorBalance < tokenAmount) {
        revert InvalidAmount();
    }

    redemptionValue =
        (tokenAmount * navData.value) /
        totalSupply;

    if (redemptionValue == 0) {
        revert RedemptionValueTooSmall();
    }

    redemptionId = _nextRedemptionId++;

    _redemptions[redemptionId] = Redemption({
        id: redemptionId,
        assetId: assetId,
        investor: msg.sender,
        tokenAmount: tokenAmount,
        nav: navData.value,
        redemptionValue: redemptionValue,
        timestamp: block.timestamp
    });

    _investorRedemptions[msg.sender]
        .push(redemptionId);

    token.burn(
        msg.sender,
        tokenAmount
    );

    emit RedemptionExecuted(
        redemptionId,
        assetId,
        msg.sender,
        tokenAmount,
        navData.value,
        redemptionValue
    );
}

    function getRedemption(
        uint256 redemptionId
    )
        external
        view
        returns (Redemption memory)
    {
        if (
            redemptionId == 0 ||
            redemptionId >= _nextRedemptionId
        ) {
            revert InvalidAmount();
        }

        return _redemptions[redemptionId];
    }

    function getInvestorRedemptions(
        address investor
    )
        external
        view
        returns (uint256[] memory)
    {
        return _investorRedemptions[investor];
    }

    function nextRedemptionId()
        external
        view
        returns (uint256)
    {
        return _nextRedemptionId;
    }

    function calculateRedemptionValue(
    uint256 assetId,
    uint256 tokenAmount
)
    external
    view
    returns (uint256)
{
    if (
        assetId == 0 ||
        !assetRegistry.assetExists(assetId)
    ) {
        revert InvalidAsset();
    }

    if (tokenAmount == 0) {
        revert InvalidAmount();
    }

    IAssetRegistry.Asset memory asset =
        assetRegistry.getAsset(assetId);

    address tokenAddress = asset.tokenAddress;

    if (!asset.active) {
        revert InvalidAsset();
    }

    if (tokenAddress == address(0)) {
        revert AssetTokenNotLinked();
    }

    if (!navOracle.hasNAV(assetId)) {
        revert NAVUnavailable();
    }

    INAVOracle.NAVData memory navData =
        navOracle.getNAV(assetId);

    uint256 totalSupply =
        IAssetToken(tokenAddress).totalSupply();

    if (totalSupply == 0) {
        revert InvalidSupply();
    }

    return
        (tokenAmount * navData.value) /
        totalSupply;
}
}