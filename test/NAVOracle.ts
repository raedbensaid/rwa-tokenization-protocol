import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
describe("NAVOracle", function () {
  async function deployFixture() {
    const [
      owner,
      updater,
      investor,
    ] = await ethers.getSigners();

    const AssetRegistry =
      await ethers.getContractFactory(
        "AssetRegistry"
      );

    const assetRegistry =
      await AssetRegistry.deploy(
        owner.address
      );

    await assetRegistry.waitForDeployment();

    const NAVOracle =
      await ethers.getContractFactory(
        "NAVOracle"
      );

    const oracle =
      await NAVOracle.deploy(
        owner.address,
        await assetRegistry.getAddress()
      );

    await oracle.waitForDeployment();

    return {
      owner,
      updater,
      investor,
      assetRegistry,
      oracle,
    };
  }

  describe("Deployment", function () {
    it("sets the correct admin", async function () {
      const {
        owner,
        oracle,
      } = await deployFixture();

      const DEFAULT_ADMIN_ROLE =
        await oracle.DEFAULT_ADMIN_ROLE();

      expect(
        await oracle.hasRole(
          DEFAULT_ADMIN_ROLE,
          owner.address
        )
      ).to.equal(true);
    });

    it("stores the asset registry address", async function () {
      const {
        assetRegistry,
        oracle,
      } = await deployFixture();

      expect(
        await oracle.assetRegistry()
      ).to.equal(
        await assetRegistry.getAddress()
      );
    });

    it("grants NAV_UPDATER_ROLE to the admin", async function () {
      const {
        owner,
        oracle,
      } = await deployFixture();

      const NAV_UPDATER_ROLE =
        await oracle.NAV_UPDATER_ROLE();

      expect(
        await oracle.hasRole(
          NAV_UPDATER_ROLE,
          owner.address
        )
      ).to.equal(true);
    });
  });

  describe("Access control", function () {
    it("allows the admin to grant NAV_UPDATER_ROLE", async function () {
      const {
        owner,
        updater,
        oracle,
      } = await deployFixture();

      const NAV_UPDATER_ROLE =
        await oracle.NAV_UPDATER_ROLE();

      await oracle
        .connect(owner)
        .grantRole(
          NAV_UPDATER_ROLE,
          updater.address
        );

      expect(
        await oracle.hasRole(
          NAV_UPDATER_ROLE,
          updater.address
        )
      ).to.equal(true);
    });

    it("rejects NAV updates from unauthorized accounts", async function () {
      const {
        owner,
        investor,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      await expect(
        oracle
          .connect(investor)
          .setNAV(
            1,
            ethers.parseUnits(
              "1200000",
              2
            )
          )
      ).to.be.revert(ethers);
    });

    it("rejects role administration by unauthorized accounts", async function () {
      const {
        investor,
        updater,
        oracle,
      } = await deployFixture();

      const NAV_UPDATER_ROLE =
        await oracle.NAV_UPDATER_ROLE();

      await expect(
        oracle
          .connect(investor)
          .grantRole(
            NAV_UPDATER_ROLE,
            updater.address
          )
      ).to.be.revert(ethers);
    });
  });

  describe("NAV updates", function () {
    it("stores NAV for a registered asset", async function () {
      const {
        owner,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      const nav =
        ethers.parseUnits(
          "1250000",
          2
        );

      await oracle
        .connect(owner)
        .setNAV(1, nav);

      const data =
        await oracle.getNAV(1);

      expect(data.value).to.equal(nav);
      expect(data.updatedAt).to.be.greaterThan(0);
    });

    it("updates an existing NAV", async function () {
      const {
        owner,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      const firstNAV =
        ethers.parseUnits(
          "1000000",
          2
        );

      const secondNAV =
        ethers.parseUnits(
          "1100000",
          2
        );

      await oracle
        .connect(owner)
        .setNAV(
          1,
          firstNAV
        );

      await oracle
        .connect(owner)
        .setNAV(
          1,
          secondNAV
        );

      const data =
        await oracle.getNAV(1);

      expect(data.value).to.equal(
        secondNAV
      );
    });

    it("emits NAVUpdated when NAV changes", async function () {
      const {
        owner,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      const nav =
        ethers.parseUnits(
          "1250000",
          2
        );

      await expect(
        oracle
          .connect(owner)
          .setNAV(1, nav)
      )
        .to.emit(
          oracle,
          "NAVUpdated"
        )
        .withArgs(
          1,
          nav,
          (value: bigint) => value > 0n,
          owner.address
        );
    });

    it("allows a NAV updater to update NAV", async function () {
      const {
        owner,
        updater,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      const NAV_UPDATER_ROLE =
        await oracle.NAV_UPDATER_ROLE();

      await oracle
        .connect(owner)
        .grantRole(
          NAV_UPDATER_ROLE,
          updater.address
        );

      const nav =
        ethers.parseUnits(
          "1500000",
          2
        );

      await oracle
        .connect(updater)
        .setNAV(
          1,
          nav
        );

      const data =
        await oracle.getNAV(1);

      expect(data.value).to.equal(nav);
    });
  });

  describe("Validation", function () {
    it("rejects asset ID zero", async function () {
      const {
        owner,
        oracle,
      } = await deployFixture();

      await expect(
        oracle
          .connect(owner)
          .setNAV(
            0,
            100
          )
      ).to.be.revert(ethers);
    });

    it("rejects NAV value zero", async function () {
      const {
        owner,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      await expect(
        oracle
          .connect(owner)
          .setNAV(
            1,
            0
          )
      ).to.be.revert(ethers);
    });

    it("rejects NAV updates for unknown assets", async function () {
      const {
        owner,
        oracle,
      } = await deployFixture();

      await expect(
        oracle
          .connect(owner)
          .setNAV(
            999,
            100000
          )
      ).to.be.revert(ethers);
    });

    it("rejects reading NAV that has not been initialized", async function () {
      const {
        oracle,
      } = await deployFixture();

      await expect(
        oracle.getNAV(1)
      ).to.be.revert(ethers);
    });

    it("reports whether an asset has NAV data", async function () {
      const {
        owner,
        assetRegistry,
        oracle,
      } = await deployFixture();

      await assetRegistry
        .connect(owner)
        .registerAsset(
          "Real Estate Fund",
          "REF",
          "ipfs://asset-1",
          owner.address,
          ethers.parseUnits("1000000", 2)
        );

      expect(
        await oracle.hasNAV(1)
      ).to.equal(false);

      await oracle
        .connect(owner)
        .setNAV(
          1,
          ethers.parseUnits(
            "1000000",
            2
          )
        );

      expect(
        await oracle.hasNAV(1)
      ).to.equal(true);
    });
  });
});