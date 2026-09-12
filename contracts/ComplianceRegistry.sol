// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ComplianceRegistry is Ownable {
    struct Investor {
        bool approved;
        uint256 approvedAt;
        uint256 expiresAt;
        string jurisdiction;
    }

    mapping(address => Investor) private _investors;

    event InvestorApproved(
        address indexed investor,
        string jurisdiction,
        uint256 approvedAt,
        uint256 expiresAt
    );

    event InvestorRevoked(
        address indexed investor
    );

    event InvestorExpiryUpdated(
        address indexed investor,
        uint256 expiresAt
    );

    error InvalidInvestor();
    error InvalidExpiry();
    error InvestorNotApproved();
    error InvestorAlreadyRevoked();

    constructor(address initialOwner)
        Ownable(initialOwner)
    {}

    function approveInvestor(
        address investor,
        string calldata jurisdiction,
        uint256 expiresAt
    )
        external
        onlyOwner
    {
        if (investor == address(0)) {
            revert InvalidInvestor();
        }

        if (
            expiresAt != 0 &&
            expiresAt <= block.timestamp
        ) {
            revert InvalidExpiry();
        }

        _investors[investor] = Investor({
            approved: true,
            approvedAt: block.timestamp,
            expiresAt: expiresAt,
            jurisdiction: jurisdiction
        });

        emit InvestorApproved(
            investor,
            jurisdiction,
            block.timestamp,
            expiresAt
        );
    }

    function revokeInvestor(
        address investor
    )
        external
        onlyOwner
    {
        if (investor == address(0)) {
            revert InvalidInvestor();
        }

        if (!_investors[investor].approved) {
            revert InvestorAlreadyRevoked();
        }

        _investors[investor].approved = false;

        emit InvestorRevoked(investor);
    }

    function updateExpiry(
        address investor,
        uint256 expiresAt
    )
        external
        onlyOwner
    {
        if (investor == address(0)) {
            revert InvalidInvestor();
        }

        if (!_investors[investor].approved) {
            revert InvestorNotApproved();
        }

        if (
            expiresAt != 0 &&
            expiresAt <= block.timestamp
        ) {
            revert InvalidExpiry();
        }

        _investors[investor].expiresAt = expiresAt;

        emit InvestorExpiryUpdated(
            investor,
            expiresAt
        );
    }

    function isApproved(
        address investor
    )
        public
        view
        returns (bool)
    {
        Investor memory record = _investors[investor];

        if (!record.approved) {
            return false;
        }

        if (
            record.expiresAt != 0 &&
            block.timestamp >= record.expiresAt
        ) {
            return false;
        }

        return true;
    }

    function getInvestor(
        address investor
    )
        external
        view
        returns (Investor memory)
    {
        return _investors[investor];
    }
}