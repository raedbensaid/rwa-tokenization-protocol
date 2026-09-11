import { expect } from "chai";
import { network } from "hardhat";
const { ethers } = await network.create();

describe("AssetToken", function () {
  async function deployToken() {

    const [
      owner,
      minter,
      burner,
      pauser,
      investor,
      unauthorized,
    ] = await ethers.getSigners();

    const assetId = 1n;

    const token = await ethers.deployContract("AssetToken", [
      "Toronto Downtown Property",
      "TDP",
      assetId,
      owner.address,
    ]);

    await token.waitForDeployment();

    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();

    return {
      token,
      owner,
      minter,
      burner,
      pauser,
      investor,
      unauthorized,
      assetId,
      MINTER_ROLE,
      BURNER_ROLE,
      PAUSER_ROLE,
    };
  }

  describe("Deployment", function () {
    it("sets the correct token name", async function () {
      const { token } = await deployToken();

      expect(await token.name()).to.equal(
        "Toronto Downtown Property"
      );
    });

    it("sets the correct token symbol", async function () {
      const { token } = await deployToken();

      expect(await token.symbol()).to.equal("TDP");
    });

    it("uses 18 decimals", async function () {
      const { token } = await deployToken();

      expect(await token.decimals()).to.equal(18);
    });

    it("starts with zero supply", async function () {
      const { token } = await deployToken();

      expect(await token.totalSupply()).to.equal(0n);
    });

    it("stores the asset ID", async function () {
      const { token, assetId } = await deployToken();

      expect(await token.assetId()).to.equal(assetId);
    });

    it("grants the expected roles to the owner", async function () {
      const {
        token,
        owner,
        MINTER_ROLE,
        BURNER_ROLE,
        PAUSER_ROLE,
      } = await deployToken();

      expect(
        await token.hasRole(MINTER_ROLE, owner.address)
      ).to.equal(true);

      expect(
        await token.hasRole(BURNER_ROLE, owner.address)
      ).to.equal(true);

      expect(
        await token.hasRole(PAUSER_ROLE, owner.address)
      ).to.equal(true);
    });
  });

  describe("Role management", function () {
    it("allows the owner to grant the minter role", async function () {
      const {
        token,
        owner,
        minter,
        MINTER_ROLE,
      } = await deployToken();

      await expect(
        token
          .connect(owner)
          .grantRole(MINTER_ROLE, minter.address)
      )
        .to.emit(token, "RoleGranted")
        .withArgs(
          MINTER_ROLE,
          minter.address,
          owner.address
        );

      expect(
        await token.hasRole(MINTER_ROLE, minter.address)
      ).to.equal(true);
    });

    it("allows the owner to grant the burner role", async function () {
      const {
        token,
        owner,
        burner,
        BURNER_ROLE,
      } = await deployToken();

      await expect(
        token
          .connect(owner)
          .grantRole(BURNER_ROLE, burner.address)
      )
        .to.emit(token, "RoleGranted")
        .withArgs(
          BURNER_ROLE,
          burner.address,
          owner.address
        );

      expect(
        await token.hasRole(BURNER_ROLE, burner.address)
      ).to.equal(true);
    });

    it("allows the owner to grant the pauser role", async function () {
      const {
        token,
        owner,
        pauser,
        PAUSER_ROLE,
      } = await deployToken();

      await expect(
        token
          .connect(owner)
          .grantRole(PAUSER_ROLE, pauser.address)
      )
        .to.emit(token, "RoleGranted")
        .withArgs(
          PAUSER_ROLE,
          pauser.address,
          owner.address
        );

      expect(
        await token.hasRole(PAUSER_ROLE, pauser.address)
      ).to.equal(true);
    });
  });

  describe("Minting", function () {
    it("allows a minter to mint tokens", async function () {
      const {
        token,
        owner,
        minter,
        investor,
        MINTER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .grantRole(MINTER_ROLE, minter.address);

      const amount = 1_000n * 10n ** 18n;

      await expect(
        token
          .connect(minter)
          .mint(investor.address, amount)
      )
        .to.emit(token, "Transfer")
        .withArgs(
          ethers.ZeroAddress,
          investor.address,
          amount
        );

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(amount);

      expect(
        await token.totalSupply()
      ).to.equal(amount);
    });

    it("rejects minting by an unauthorized account", async function () {
      const {
        token,
        unauthorized,
        investor,
      } = await deployToken();

      await expect(
        token
          .connect(unauthorized)
          .mint(investor.address, 1000n)
      ).to.be.revert(ethers);
    });

    it("rejects minting to the zero address", async function () {
      const { token, owner } = await deployToken();

      await expect(
        token
          .connect(owner)
          .mint(ethers.ZeroAddress, 1000n)
      ).to.be.revert(ethers);
    });
  });

  describe("Burning", function () {
    it("allows a burner to burn tokens from an account", async function () {
      const {
        token,
        owner,
        burner,
        investor,
        MINTER_ROLE,
        BURNER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .grantRole(MINTER_ROLE, owner.address);

      await token
        .connect(owner)
        .grantRole(BURNER_ROLE, burner.address);

      const amount = 1_000n * 10n ** 18n;

      await token
        .connect(owner)
        .mint(investor.address, amount);

      await expect(
        token
          .connect(burner)
          .burn(investor.address, amount)
      )
        .to.emit(token, "Transfer")
        .withArgs(
          investor.address,
          ethers.ZeroAddress,
          amount
        );

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(0n);

      expect(
        await token.totalSupply()
      ).to.equal(0n);
    });

    it("rejects burning by an unauthorized account", async function () {
      const {
        token,
        owner,
        investor,
        unauthorized,
        MINTER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .grantRole(MINTER_ROLE, owner.address);

      await token
        .connect(owner)
        .mint(investor.address, 1000n);

      await expect(
        token
          .connect(unauthorized)
          .burn(investor.address, 1000n)
      ).to.be.revert(ethers);
    });
  });

  describe("Transfers", function () {
    it("allows normal ERC-20 transfers", async function () {
      const {
        token,
        owner,
        investor,
        MINTER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .mint(investor.address, 1000n);

      await token
        .connect(investor)
        .transfer(owner.address, 400n);

      expect(
        await token.balanceOf(investor.address)
      ).to.equal(600n);

      expect(
        await token.balanceOf(owner.address)
      ).to.equal(400n);
    });
  });

  describe("Pausing", function () {
    it("allows the pauser to pause the token", async function () {
      const {
        token,
        owner,
        pauser,
        PAUSER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .grantRole(PAUSER_ROLE, pauser.address);

      await expect(
        token.connect(pauser).pause()
      )
        .to.emit(token, "Paused")
        .withArgs(pauser.address);

      expect(await token.paused()).to.equal(true);
    });

    it("blocks transfers while paused", async function () {
      const {
        token,
        owner,
        investor,
        MINTER_ROLE,
        PAUSER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .mint(investor.address, 1000n);

      await token
        .connect(owner)
        .pause();

      await expect(
        token
          .connect(investor)
          .transfer(owner.address, 100n)
      ).to.be.revert(ethers);
    });

    it("allows the pauser to unpause the token", async function () {
      const {
        token,
        owner,
        pauser,
        PAUSER_ROLE,
      } = await deployToken();

      await token
        .connect(owner)
        .grantRole(PAUSER_ROLE, pauser.address);

      await token.connect(pauser).pause();

      await expect(
        token.connect(pauser).unpause()
      )
        .to.emit(token, "Unpaused")
        .withArgs(pauser.address);

      expect(await token.paused()).to.equal(false);
    });
  });
});