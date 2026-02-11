import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [owner] = await ethers.getSigners();
  const APEXMembershipNFT = await ethers.getContractFactory("APEXMembershipNFT");
  const contract = await APEXMembershipNFT.deploy(owner.address, "https://example.com/", 1000);
  await contract.waitForDeployment();

  console.log("Contract deployed to:", await contract.getAddress());

  // === Batch Mint (50) ===
  const recipients50 = [];
  for (let i = 0; i < 50; i++) {
    recipients50.push(ethers.Wallet.createRandom().address);
  }

  const tx50 = await contract.batchMintMembership(recipients50);
  const receipt50 = await tx50.wait();

  const gas50 = receipt50.gasUsed.toString();
  console.log(`Gas used for Batch Mint (50): ${gas50}`);

  // === Single Mint (1) ===
  // Deploy new contract for isolation
  const contractSingle = await APEXMembershipNFT.deploy(owner.address, "https://example.com/", 1000);
  await contractSingle.waitForDeployment();

  const recipients1 = [ethers.Wallet.createRandom().address];
  const tx1 = await contractSingle.batchMintMembership(recipients1);
  const receipt1 = await tx1.wait();

  const gas1 = receipt1.gasUsed.toString();
  console.log(`Gas used for Single Mint (1): ${gas1}`);

  // === Zero Event (Empty Array) ===
  const contractZero = await APEXMembershipNFT.deploy(owner.address, "https://example.com/", 1000);
  await contractZero.waitForDeployment();
  try {
    await contractZero.batchMintMembership([]);
    console.error("Zero Event: Failed (did not revert)");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("APEXMembershipNFT: empty recipients array")) {
      console.log("Zero Event: Passed (reverted correctly)");
    } else {
      console.error(`Zero Event: Failed (unexpected error: ${message})`);
    }
  }

  // === Boundary Breach (Exceed Max Supply) ===
  // Set max supply to 2
  const contractBoundary = await APEXMembershipNFT.deploy(owner.address, "https://example.com/", 2);
  await contractBoundary.waitForDeployment();
  const recipientsBoundary = [
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address
  ]; // 3 recipients
  try {
    await contractBoundary.batchMintMembership(recipientsBoundary);
    console.error("Boundary Breach: Failed (did not revert)");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("APEXMembershipNFT: would exceed max supply")) {
        console.log("Boundary Breach: Passed (reverted correctly)");
    } else {
        console.error(`Boundary Breach: Failed (unexpected error: ${message})`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
