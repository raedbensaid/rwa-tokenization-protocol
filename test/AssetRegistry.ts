import { expect } from "chai";
import { network } from "hardhat";

describe("AssetRegistry", function () {
  async function deployRegistry() {
    const { ethers } = await network.connect();

    const [owner, issuer, investor] = await ethers.getSigners();

    const registry = await ethers.deployContract(
      "AssetRegistry",
      [owner.address]
    );

    await registry.waitForDeployment();

    return {
      registry,
      owner,
      issuer,
      investor,
    };
  }

  describe("Deployment", function () {
    it("sets the correct owner", async function () {
      const { registry, owner } = await deployRegistry();

      expect(await registry.owner()).to.equal(owner.address);
    });

    it("starts asset IDs at 1", async function () {
      const { registry } = await deployRegistry();

      expect(await registry.nextAssetId()).to.equal(1n);
    });
  });

describe("Asset registration", function () {
    it("registers an asset", async function () {
      const {
        registry,
        issuer,
      } = await deployRegistry();

      await expect(
        registry.registerAsset(
          "Toronto Downtown Property",
          "TDP",
          "ipfs://property-metadata",
          issuer.address,
          2_500_000
        )
      )
        .to.emit(registry, "AssetRegistered")
        .withArgs(
          1,
          "Toronto Downtown Property",
          "TDP",
          issuer.address,
          2_500_000
        );

      const asset = await registry.getAsset(1);

      expect(asset.id).to.equal(1n);
      expect(asset.name).to.equal(
        "Toronto Downtown Property"
      );
      expect(asset.symbol).to.equal("TDP");
      expect(asset.metadataURI).to.equal(
        "ipfs://property-metadata"
      );
      expect(asset.issuer).to.equal(issuer.address);
      expect(asset.totalValue).to.equal(2_500_000n);
      expect(asset.tokenAddress).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(asset.active).to.equal(true);
      expect(asset.createdAt).to.be.greaterThan(0n);
    });

    it("increments the asset ID", async function () {
      const {
        registry,
        issuer,
      } = await deployRegistry();

      await registry.registerAsset(
        "Property One",
        "PROP1",
        "ipfs://one",
        issuer.address,
        1_000_000
      );

      await registry.registerAsset(
        "Property Two",
        "PROP2",
        "ipfs://two",
        issuer.address,
        2_000_000
      );

      expect(await registry.nextAssetId()).to.equal(3n);

      expect((await registry.getAsset(1)).name)
        .to.equal("Property One");

      expect((await registry.getAsset(2)).name)
        .to.equal("Property Two");
    });
  });

describe("Access control", function () {
    it("only owner can register an asset", async function () {
      const {
        registry,
        issuer,
      } = await deployRegistry();

      await expect(
        registry
          .connect(issuer)
          .registerAsset(
            "Unauthorized Property",
            "UP",
            "ipfs://unauthorized",
            issuer.address,
            1_000_000
          )
      ).to.be.revertedWithCustomError(
        registry,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Validation", function () {
    it("rejects an empty name", async function () {
      const { registry, issuer } = await deployRegistry();

      await expect(
        registry.registerAsset(
          "",
          "PROP",
          "ipfs://metadata",
          issuer.address,
          1_000_000
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidName"
      );
    });

    it("rejects an empty symbol", async function () {
      const { registry, issuer } = await deployRegistry();

      await expect(
        registry.registerAsset(
          "Property",
          "",
          "ipfs://metadata",
          issuer.address,
          1_000_000
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidSymbol"
      );
    });

    it("rejects the zero issuer address", async function () {
      const { registry } = await deployRegistry();

      await expect(
        registry.registerAsset(
          "Property",
          "PROP",
          "ipfs://metadata",
          "0x0000000000000000000000000000000000000000",
          1_000_000
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidIssuer"
      );
    });

    it("rejects zero asset value", async function () {
      const { registry, issuer } = await deployRegistry();

      await expect(
        registry.registerAsset(
          "Property",
          "PROP",
          "ipfs://metadata",
          issuer.address,
          0
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidValue"
      );
    });
  });

  describe("Asset updates", function () {
    it("updates metadata and value", async function () {
      const { registry, issuer } = await deployRegistry();

      await registry.registerAsset(
        "Property",
        "PROP",
        "ipfs://old",
        issuer.address,
        1_000_000
      );

      await expect(
        registry.updateAsset(
          1,
          "ipfs://new",
          1_200_000
        )
      )
        .to.emit(registry, "AssetUpdated")
        .withArgs(
          1,
          "ipfs://new",
          1_200_000
        );

      const asset = await registry.getAsset(1);

      expect(asset.metadataURI).to.equal("ipfs://new");
      expect(asset.totalValue).to.equal(1_200_000n);
    });
  });

  describe("Asset lifecycle", function () {
    it("can deactivate an asset", async function () {
      const { registry, issuer } = await deployRegistry();

      await registry.registerAsset(
        "Property",
        "PROP",
        "ipfs://metadata",
        issuer.address,
        1_000_000
      );

      await expect(
        registry.deactivateAsset(1)
      )
        .to.emit(registry, "AssetStatusChanged")
        .withArgs(1, false);

      expect(
        (await registry.getAsset(1)).active
      ).to.equal(false);
    });

    it("can reactivate an asset", async function () {
      const { registry, issuer } = await deployRegistry();

      await registry.registerAsset(
        "Property",
        "PROP",
        "ipfs://metadata",
        issuer.address,
        1_000_000
      );

      await registry.deactivateAsset(1);
      await registry.activateAsset(1);

      expect(
        (await registry.getAsset(1)).active
      ).to.equal(true);
    });

    it("rejects operations on an unknown asset", async function () {
      const { registry } = await deployRegistry();

      await expect(
        registry.getAsset(999)
      ).to.be.revertedWithCustomError(
        registry,
        "AssetNotFound"
      );
    });
  });

  describe("Token linking", function () {
    it("links a token contract to an asset", async function () {
      const {
        registry,
        issuer,
        investor,
      } = await deployRegistry();

      await registry.registerAsset(
        "Property",
        "PROP",
        "ipfs://metadata",
        issuer.address,
        1_000_000
      );

      await expect(
        registry.linkToken(1, investor.address)
      )
        .to.emit(registry, "AssetTokenLinked")
        .withArgs(1, investor.address);

      expect(
        (await registry.getAsset(1)).tokenAddress
      ).to.equal(investor.address);
    });

    it("rejects the zero token address", async function () {
      const { registry, issuer } = await deployRegistry();

      await registry.registerAsset(
        "Property",
        "PROP",
        "ipfs://metadata",
        issuer.address,
        1_000_000
      );

      await expect(
        registry.linkToken(
          1,
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.revertedWithCustomError(
        registry,
        "InvalidTokenAddress"
      );
    });
  });
});