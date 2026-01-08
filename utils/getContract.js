const constants = require("./constants");
const path = require("path");
const fs = require("fs");

/**
 * Load Foundry artifact and extract ABI
 * @param {string} fileName - The contract file name (e.g., 'RandomAuRa')
 * @param {string} contractName - The contract name inside the file (usually same as fileName)
 * @returns {object} - The artifact object with ABI
 */
function loadFoundryArtifact(fileName, contractName) {
    const artifactPath = path.join(
        __dirname,
        "../PoS-contracts/build/contracts",
        `${fileName}.sol`,
        `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at: ${artifactPath}`);
    }

    return require(artifactPath);
}

module.exports = function (contractName, web3) {
    let abi;
    let artifactData;

    try {
        switch (contractName) {
            case "RandomAuRa":
                artifactData = loadFoundryArtifact("RandomAuRa", "RandomAuRa");
                abi = artifactData.abi;
                return {
                    address: constants.RANDOM_AURA_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.RANDOM_AURA_ADDRESS
                    ),
                };

            case "BlockRewardAuRa":
                // Note: Foundry builds BlockRewardAuRaCoins.json
                artifactData = loadFoundryArtifact(
                    "BlockRewardAuRaCoins",
                    "BlockRewardAuRaCoins"
                );
                abi = artifactData.abi;
                return {
                    address: constants.BLOCK_REWARD_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.BLOCK_REWARD_ADDRESS
                    ),
                };

            case "Certifier":
                artifactData = loadFoundryArtifact("Certifier", "Certifier");
                abi = artifactData.abi;
                return {
                    address: constants.CERTIFIER_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.CERTIFIER_ADDRESS
                    ),
                };

            case "ValidatorSetAuRa":
                artifactData = loadFoundryArtifact(
                    "ValidatorSetAuRa",
                    "ValidatorSetAuRa"
                );
                abi = artifactData.abi;
                return {
                    address: constants.VALIDATOR_SET_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.VALIDATOR_SET_ADDRESS
                    ),
                };

            case "StakingAuRa":
                // Note: Foundry builds StakingAuRaCoins.json
                artifactData = loadFoundryArtifact(
                    "StakingAuRaCoins",
                    "StakingAuRaCoins"
                );
                abi = artifactData.abi;
                return {
                    address: constants.STAKING_CONTRACT_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.STAKING_CONTRACT_ADDRESS
                    ),
                };
      
            case "TxPriority":
                artifactData = loadFoundryArtifact(
                    "TxPriorityMock",
                    "TxPriorityMock"
                );
                abi = artifactData.abi;
                return {
                    address: constants.TX_PRIORITY_CONTRACT_ADDRESS,
                    abi: abi,
                    instance: new web3.eth.Contract(
                        abi,
                        constants.TX_PRIORITY_CONTRACT_ADDRESS
                    ),
                };

            default:
                throw new Error("Unknown contract: " + contractName);
        }
    } catch (error) {
        console.error(`Error loading contract ${contractName}:`, error.message);
        throw error;
    }
};
