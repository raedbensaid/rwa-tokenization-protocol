import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("RedemptionManager", function () {
  async function deployFixture() {
    const [owner, investor, unapprovedInvestor] =
      await ethers.getSigners();

    const AssetRegistry =
      await ethers.getContractFactory(
        "AssetRegistry"
      );

    const assetRegistry =
      await AssetRegistry.deploy(
        owner.address
      );

    await assetRegistry.waitForDeployment();

    const ComplianceRegistry =
      await ethers.getContractFactory(
        "ComplianceRegistry"
      );

    const complianceRegistry =
      (await ComplianceRegistry.deploy(
        owner.address
      )) as any;

    await complianceRegistry.waitForDeployment();

    const AssetToken =
      await ethers.getContractFactory(
        "AssetToken"
      );

    const token =
      (await AssetToken.deploy(
        "Real Estate Fund",
        "REF",
        1,
        owner.address,
        await complianceRegistry.getAddress()
      )) as any;

    await token.waitForDeployment();

    await assetRegistry
      .connect(owner)
      .registerAsset(
        "Real Estate Fund",
        "REF",
        "ipfs://asset-1",
        owner.address,
        ethers.parseUnits(
          "1000000",
          2
        )
      );

    await assetRegistry
      .connect(owner)
      .linkToken(
        1,
        await token.getAddress()
      );

    const NAVOracle =
      await ethers.getContractFactory(
        "NAVOracle"
      );

    const navOracle =
      (await NAVOracle.deploy(
        owner.address,
        await assetRegistry.getAddress()
      )) as any;

    await navOracle.waitForDeployment();

    const RedemptionManager =
      await ethers.getContractFactory(
        "RedemptionManager"
      );

    const redemptionManager =
      (await RedemptionManager.deploy(
        await assetRegistry.getAddress(),
        await navOracle.getAddress(),
        await complianceRegistry.getAddress()
      )) as any;

    await redemptionManager.waitForDeployment();

    const BURNER_ROLE =
      await token.BURNER_ROLE();

    await token
      .connect(owner)
      .grantRole(
        BURNER_ROLE,
        await redemptionManager.getAddress()
      );

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
    owner.address,
    "CA",
    0
  );
    return {
      owner,
      investor,
      unapprovedInvestor,
      assetRegistry,
      complianceRegistry,
      token,
      navOracle,
      redemptionManager,
    };
  }

  async function setupNAVAndSupply() {
    const fixture =
      await deployFixture();

    const {
      owner,
      investor,
      token,
      navOracle,
    } = fixture;

    const totalSupply =
      ethers.parseUnits(
        "1000000",
        2
      );

    const investorAmount =
      ethers.parseUnits(
        "10000",
        2
      );

    const remainingAmount =
      totalSupply - investorAmount;

    const nav =
      ethers.parseUnits(
        "1000000",
        2
      );

    await token
      .connect(owner)
      .mint(
        investor.address,
        investorAmount
      );

    await token
      .connect(owner)
      .mint(
        owner.address,
        remainingAmount
      );

    await navOracle
      .connect(owner)
      .setNAV(
        1,
        nav
      );

    return {
      ...fixture,
      totalSupply,
      investorAmount,
      nav,
    };
  }

  describe("Deployment", function () {
    it("stores the asset registry address", async function () {
      const {
        assetRegistry,
        redemptionManager,
      } = await deployFixture();

      expect(
        await redemptionManager.assetRegistry()
      ).to.equal(
        await assetRegistry.getAddress()
      );
    });

    it("stores the NAV oracle address", async function () {
      const {
        navOracle,
        redemptionManager,
      } = await deployFixture();

      expect(
        await redemptionManager.navOracle()
      ).to.equal(
        await navOracle.getAddress()
      );
    });

    it("stores the compliance registry address", async function () {
      const {
        complianceRegistry,
        redemptionManager,
      } = await deployFixture();

      expect(
        await redemptionManager.complianceRegistry()
      ).to.equal(
        await complianceRegistry.getAddress()
      );
    });
  });

  describe("Redemption calculation", function () {
    it("calculates redemption value from NAV", async function () {
      const {
        redemptionManager,
        investorAmount,
        nav,
        token,
      } = await setupNAVAndSupply();

      const value =
        await redemptionManager
          .calculateRedemptionValue(
            1,
            investorAmount
          );

      const totalSupply =
        await token.totalSupply();

      const expected =
        (investorAmount * nav) /
        totalSupply;

      expect(value).to.equal(
        expected
      );
    });

    it("returns the expected value for a 1% ownership position", async function () {
      const {
        redemptionManager,
        investorAmount,
      } = await setupNAVAndSupply();

      const value =
        await redemptionManager
          .calculateRedemptionValue(
            1,
            investorAmount
          );

      expect(value).to.equal(
        ethers.parseUnits(
          "10000",
          2
        )
      );
    });
  });

  describe("Redemption", function () {
    it("burns the investor tokens", async function () {
      const {
        investor,
        token,
        investorAmount,
        redemptionManager,
      } = await setupNAVAndSupply();

      const balanceBefore =
        await token.balanceOf(
          investor.address
        );

      await redemptionManager
        .connect(investor)
        .redeem(
          1,
          investorAmount
        );

      const balanceAfter =
        await token.balanceOf(
          investor.address
        );

      expect(balanceBefore).to.equal(
        investorAmount
      );

      expect(balanceAfter).to.equal(0);

      expect(
        await token.totalSupply()
      ).to.equal(
        ethers.parseUnits(
          "990000",
          2
        )
      );
    });

    it("records the redemption", async function () {
      const {
        investor,
        investorAmount,
        nav,
        redemptionManager,
      } = await setupNAVAndSupply();

      await redemptionManager
        .connect(investor)
        .redeem(
          1,
          investorAmount
        );

      const redemption =
        await redemptionManager
          .getRedemption(1);

      expect(redemption.id).to.equal(1);

      expect(redemption.assetId).to.equal(1);

      expect(
        redemption.investor
      ).to.equal(
        investor.address
      );

      expect(
        redemption.tokenAmount
      ).to.equal(
        investorAmount
      );

      expect(redemption.nav).to.equal(
        nav
      );

      expect(
        redemption.redemptionValue
      ).to.equal(
        ethers.parseUnits(
          "10000",
          2
        )
      );

      expect(
        redemption.timestamp
      ).to.be.greaterThan(0);
    });

    it("emits RedemptionExecuted", async function () {
      const {
        investor,
        investorAmount,
        nav,
        redemptionManager,
      } = await setupNAVAndSupply();

      const expectedValue =
        ethers.parseUnits(
          "10000",
          2
        );

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            1,
            investorAmount
          )
      )
        .to.emit(
          redemptionManager,
          "RedemptionExecuted"
        )
        .withArgs(
          1,
          1,
          investor.address,
          investorAmount,
          nav,
          expectedValue
        );
    });

    it("allows multiple redemptions", async function () {
      const {
        owner,
        investor,
        investorAmount,
        redemptionManager,
        token,
      } = await setupNAVAndSupply();

      const secondAmount =
        ethers.parseUnits(
          "5000",
          2
        );

      await token
        .connect(owner)
        .mint(
          investor.address,
          secondAmount
        );

      await redemptionManager
        .connect(investor)
        .redeem(
          1,
          investorAmount
        );

      await redemptionManager
        .connect(investor)
        .redeem(
          1,
          secondAmount
        );

      expect(
        await redemptionManager
          .nextRedemptionId()
      ).to.equal(3);

      const ids =
        await redemptionManager
          .getInvestorRedemptions(
            investor.address
          );

      expect(ids.length).to.equal(2);

      expect(ids[0]).to.equal(1);

      expect(ids[1]).to.equal(2);
    });
  });

  describe("Validation", function () {
    it("rejects an unknown asset", async function () {
      const {
        investor,
        redemptionManager,
      } = await setupNAVAndSupply();

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            999,
            100
          )
      ).to.be.revert(ethers);
    });

    it("rejects zero token amount", async function () {
      const {
        investor,
        redemptionManager,
      } = await setupNAVAndSupply();

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            1,
            0
          )
      ).to.be.revert(ethers);
    });

   it("rejects redemption by an unapproved investor", async function () {
  const {
    unapprovedInvestor,
    redemptionManager,
  } = await setupNAVAndSupply();

  await expect(
    redemptionManager
      .connect(unapprovedInvestor)
      .redeem(
        1,
        100
      )
  ).to.be.revert(ethers);
});

    it("rejects redemption without NAV", async function () {
      const fixture =
        await deployFixture();

      const {
        investor,
        redemptionManager,
        token,
        owner,
      } = fixture;

      const amount =
        ethers.parseUnits(
          "1000",
          2
        );

      await token
        .connect(owner)
        .mint(
          investor.address,
          amount
        );

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            1,
            amount
          )
      ).to.be.revert(ethers);
    });

    it("rejects redemption when the investor has insufficient balance", async function () {
      const {
        investor,
        redemptionManager,
      } = await setupNAVAndSupply();

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            1,
            ethers.parseUnits(
              "100000",
              2
            )
          )
      ).to.be.revert(ethers);
    });

    it("rejects redemption for an inactive asset", async function () {
      const {
        owner,
        investor,
        assetRegistry,
        redemptionManager,
        investorAmount,
      } = await setupNAVAndSupply();

      await assetRegistry
        .connect(owner)
        .deactivateAsset(1);

      await expect(
        redemptionManager
          .connect(investor)
          .redeem(
            1,
            investorAmount
          )
      ).to.be.revert(ethers);
    });
  });
});