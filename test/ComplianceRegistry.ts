import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("ComplianceRegistry", function () {
  async function deployRegistry() {
    const [
      owner,
      investor,
      investorTwo,
      unauthorized,
    ] = await ethers.getSigners();

    const registry = await ethers.deployContract(
      "ComplianceRegistry",
      [owner.address]
    );

    await registry.waitForDeployment();

    return {
      registry,
      owner,
      investor,
      investorTwo,
      unauthorized,
    };
  }

  describe("Deployment", function () {
    it("sets the initial owner", async function () {
      const { registry, owner } = await deployRegistry();

      const DEFAULT_ADMIN_ROLE = await registry.owner();

      expect(DEFAULT_ADMIN_ROLE).to.equal(owner.address);
    });
  });

  describe("Investor approval", function () {
    it("allows the owner to approve an investor", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      await expect(
        registry
          .connect(owner)
          .approveInvestor(
            investor.address,
            "CA",
            0
          )
      )
        .to.emit(registry, "InvestorApproved")
        .withArgs(
          investor.address,
          "CA",
          (value: bigint) => value > 0n,
          0n
        );

      expect(
        await registry.isApproved(investor.address)
      ).to.equal(true);
    });

    it("stores investor information", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      await registry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      const record =
        await registry.getInvestor(
          investor.address
        );

      expect(record.approved).to.equal(true);
      expect(record.jurisdiction).to.equal("CA");
      expect(record.expiresAt).to.equal(0n);
      expect(record.approvedAt).to.be.greaterThan(0n);
    });

    it("rejects approval of the zero address", async function () {
      const { registry, owner } =
        await deployRegistry();

      await expect(
        registry
          .connect(owner)
          .approveInvestor(
            ethers.ZeroAddress,
            "CA",
            0
          )
      ).to.be.revert(ethers);
    });

    it("rejects approval by an unauthorized account", async function () {
      const { registry, unauthorized, investor } =
        await deployRegistry();

      await expect(
        registry
          .connect(unauthorized)
          .approveInvestor(
            investor.address,
            "CA",
            0
          )
      ).to.be.revert(ethers);
    });
  });

  describe("Revocation", function () {
    it("allows the owner to revoke an investor", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      await registry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          0
        );

      await expect(
        registry
          .connect(owner)
          .revokeInvestor(investor.address)
      )
        .to.emit(registry, "InvestorRevoked")
        .withArgs(investor.address);

      expect(
        await registry.isApproved(
          investor.address
        )
      ).to.equal(false);
    });

    it("rejects revoking an unapproved investor", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      await expect(
        registry
          .connect(owner)
          .revokeInvestor(investor.address)
      ).to.be.revert(ethers);
    });
  });

  describe("Expiry", function () {
    it("accepts an investor with a future expiry", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      const block = await ethers.provider.getBlock(
        "latest"
      );

      const expiresAt =
        BigInt(block!.timestamp) + 30n * 24n * 60n * 60n;

      await registry
        .connect(owner)
        .approveInvestor(
          investor.address,
          "CA",
          expiresAt
        );

      expect(
        await registry.isApproved(
          investor.address
        )
      ).to.equal(true);
    });

    it("rejects an expiry in the past", async function () {
      const { registry, owner, investor } =
        await deployRegistry();

      const block = await ethers.provider.getBlock(
        "latest"
      );

      const expiresAt =
        BigInt(block!.timestamp) - 1n;

      await expect(
        registry
          .connect(owner)
          .approveInvestor(
            investor.address,
            "CA",
            expiresAt
          )
      ).to.be.revert(ethers);
    });
  });
});