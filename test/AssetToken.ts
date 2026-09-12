import { expect } from "chai";
import { network } from "hardhat";
const { ethers } = await network.create();

describe("AssetToken", function () {
  async function deployToken() {
    const [
      owner,
      investor,
      investorTwo,
      unauthorized,
    ] = await ethers.getSigners();

    const assetId = 1n;

    const complianceRegistry = await ethers.deployContract(
      "ComplianceRegistry",
      [owner.address]
    );

    await complianceRegistry.waitForDeployment();

    const token = await ethers.deployContract(
      "AssetToken",
      [
        "Toronto Downtown Property",
        "TDP",
        assetId,
        owner.address,
        await complianceRegistry.getAddress(),
      ]
    );

    await token.waitForDeployment();

    return {
      token,
      complianceRegistry,
      owner,
      investor,
      investorTwo,
      unauthorized,
      assetId,
    };
  }

  describe("Deployment", function () {
    it("sets the correct name", async function () {
      const { token } = await deployToken();

      expect(await token.name()).to.equal(
        "Toronto Downtown Property"
      );
    });

    it("sets the correct symbol", async function () {
      const { token } = await deployToken();

      expect(await token.symbol()).to.equal("TDP");
    });

    it("sets 18 decimals", async function () {
      const { token } = await deployToken();

      expect(await token.decimals()).to.equal(18);
    });

    it("starts with zero supply", async function () {
      const { token } = await deployToken();

      expect(await token.totalSupply()).to.equal(0);
    });

    it("stores the asset ID", async function () {
      const { token, assetId } = await deployToken();

      expect(await token.assetId()).to.equal(assetId);
    });

    it("stores the compliance registry address", async function () {
      const {
        token,
        complianceRegistry,
      } = await deployToken();

      expect(
        await token.complianceRegistry()
      ).to.equal(
        await complianceRegistry.getAddress()
      );
    });
  });

  describe("Roles", function () {
    it("grants admin role to the initial admin", async function () {
      const { token, owner } = await deployToken();

      const DEFAULT_ADMIN_ROLE =
        await token.DEFAULT_ADMIN_ROLE();

      expect(
        await token.hasRole(
          DEFAULT_ADMIN_ROLE,
          owner.address
        )
      ).to.equal(true);
    });

    it("grants MINTER_ROLE to the initial admin", async function () {
      const { token, owner } = await deployToken();

      const MINTER_ROLE =
        await token.MINTER_ROLE();

      expect(
        await token.hasRole(
          MINTER_ROLE,
          owner.address
        )
      ).to.equal(true);
    });

    it("grants BURNER_ROLE to the initial admin", async function () {
      const { token, owner } = await deployToken();

      const BURNER_ROLE =
        await token.BURNER_ROLE();

      expect(
        await token.hasRole(
          BURNER_ROLE,
          owner.address
        )
      ).to.equal(true);
    });

    it("grants PAUSER_ROLE to the initial admin", async function () {
      const { token, owner } = await deployToken();

      const PAUSER_ROLE =
        await token.PAUSER_ROLE();

      expect(
        await token.hasRole(
          PAUSER_ROLE,
          owner.address
        )
      ).to.equal(true);
    });
  });

  describe("Compliance", function () {
    it("rejects minting to an unapproved investor", async function () {
      const {
        token,
        owner,
        investor,
      } = await deployToken();

      const amount =
        ethers.parseEther("100");

      await expect(
        token
          .connect(owner)
          .mint(investor.address, amount)
      ).to.be.revert(ethers);
    });

    it("allows minting to an approved investor", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(investor.address, amount);

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(amount);
    });

    it("allows transfers between approved investors", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        investorTwo,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investorTwo.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(investor.address, amount);

      await token
        .connect(investor)
        .transfer(
          investorTwo.address,
          amount
        );

      expect(
        await token.balanceOf(investor)
      ).to.equal(0);

      expect(
        await token.balanceOf(investorTwo)
      ).to.equal(amount);
    });

    it("rejects transfers to an unapproved investor", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        investorTwo,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(investor.address, amount);

      await expect(
        token
          .connect(investor)
          .transfer(
            investorTwo.address,
            amount
          )
      ).to.be.revert(ethers);
    });

    it("rejects transfers from a revoked investor", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        investorTwo,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investorTwo.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(investor.address, amount);

      await complianceRegistry
        .connect(owner)
        .revokeInvestor(
          investor.address
        );

      await expect(
        token
          .connect(investor)
          .transfer(
            investorTwo.address,
            amount
          )
      ).to.be.revert(ethers);
    });
  });

  describe("Minting", function () {
    it("allows the minter to mint to an approved investor", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("1000");

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      expect(
        await token.totalSupply()
      ).to.equal(amount);
    });

    it("rejects minting by an unauthorized account", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        unauthorized,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await expect(
        token
          .connect(unauthorized)
          .mint(
            investor.address,
            ethers.parseEther("100")
          )
      ).to.be.revert(ethers);
    });
  });

  describe("Burning", function () {
    it("allows the burner to burn tokens", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      await token
        .connect(owner)
        .burn(
          investor.address,
          amount
        );

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(0);

      expect(
        await token.totalSupply()
      ).to.equal(0);
    });

    it("rejects burning by an unauthorized account", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        unauthorized,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      await expect(
        token
          .connect(unauthorized)
          .burn(
            investor.address,
            amount
          )
      ).to.be.revert(ethers);
    });

    it("allows a burner to burn tokens from a revoked investor", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      await complianceRegistry
        .connect(owner)
        .revokeInvestor(
          investor.address
        );

      await token
        .connect(owner)
        .burn(
          investor.address,
          amount
        );

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(0);
    });
  });

  describe("Pause", function () {
    it("allows the pauser to pause transfers", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await token
        .connect(owner)
        .mint(
          investor.address,
          ethers.parseEther("100")
        );

      await token
        .connect(owner)
        .pause();

      expect(
        await token.paused()
      ).to.equal(true);
    });

    it("rejects transfers while paused", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        investorTwo,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investorTwo.address,
          "CA",
          0
        );

      await token
        .connect(owner)
        .mint(
          investor.address,
          ethers.parseEther("100")
        );

      await token
        .connect(owner)
        .pause();

      await expect(
        token
          .connect(investor)
          .transfer(
            investorTwo.address,
            ethers.parseEther("10")
          )
      ).to.be.revert(ethers);
    });

    it("allows transfers after unpausing", async function () {
      const {
        token,
        complianceRegistry,
        owner,
        investor,
        investorTwo,
      } = await deployToken();

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await complianceRegistry
        .connect(owner)
        .approveInvestor(
          investorTwo.address,
          "CA",
          0
        );

      const amount =
        ethers.parseEther("100");

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      await token
        .connect(owner)
        .pause();

      await token
        .connect(owner)
        .unpause();

      await token
        .connect(investor)
        .transfer(
          investorTwo.address,
          amount
        );

      expect(
        await token.balanceOf(investorTwo.address)
      ).to.equal(amount);
    });
  });
});