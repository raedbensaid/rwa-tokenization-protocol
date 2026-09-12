// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IComplianceRegistry} from "./interfaces/IComplianceRegistry.sol";

contract AssetToken is ERC20, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public immutable assetId;

    address public immutable complianceRegistry;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 assetId_,
        address initialAdmin,
        address complianceRegistry_
    )
        ERC20(name_, symbol_)
    {
        require(initialAdmin != address(0), "AssetToken: invalid admin");
        require(assetId_ > 0, "AssetToken: invalid asset ID");
        require(
            complianceRegistry_ != address(0),
            "AssetToken: invalid compliance registry"
        );

        assetId = assetId_;
        complianceRegistry = complianceRegistry_;

        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MINTER_ROLE, initialAdmin);
        _grantRole(BURNER_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
    }

    function mint(
        address to,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(
        address from,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(ERC20, ERC20Pausable)
    {
        // Mint: only approved investor can receive tokens
        if (from == address(0) && to != address(0)) {
            require(
                IComplianceRegistry(complianceRegistry).isApproved(to),
                "AssetToken: receiver not compliant"
            );
        }

        // Normal transfer: both parties must be approved
        if (from != address(0) && to != address(0)) {
            require(
                IComplianceRegistry(complianceRegistry).isApproved(from),
                "AssetToken: sender not compliant"
            );

            require(
                IComplianceRegistry(complianceRegistry).isApproved(to),
                "AssetToken: receiver not compliant"
            );
        }

        // Burn: compliance is NOT checked here.
        // BURNER_ROLE authorization is handled by burn().
        super._update(from, to, value);
    }
}