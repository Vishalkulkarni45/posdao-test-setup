const Web3 = require("web3");
const fs = require("fs");
const path = require("path");
const constants = require("../utils/constants");
const SnS = require("../utils/signAndSendTx.js");
const sendRequest = require("../utils/sendRequest.js");
const web3 = new Web3("http://localhost:8541");
web3.eth.transactionConfirmationBlocks = 1;
const BN = web3.utils.BN;
const OWNER = constants.OWNER;
const expect = require("chai")
    .use(require("chai-bn")(BN))
    .use(require("chai-as-promised")).expect;
const BlockRewardAuRa = require("../utils/getContract")(
    "BlockRewardAuRa",
    web3
);
const ValidatorSetAuRa = require("../utils/getContract")(
    "ValidatorSetAuRa",
    web3
);
const StakingAuRa = require("../utils/getContract")("StakingAuRa", web3);
const StakingTokenContract = require("../utils/getContract")(
    "StakingToken",
    web3
);
const sendInStakingWindow = require("../utils/sendInStakingWindow");
const waitForValidatorSetChange = require("../utils/waitForValidatorSetChange");
const waitForNextStakingEpoch = require("../utils/waitForNextStakingEpoch");
const calcMinGasPrice = require("../utils/calcMinGasPrice");
const getLatestBlock = require("../utils/getLatestBlock");
const pp = require("../utils/prettyPrint");
const FAILED_EXCEPTION_MSG = "The execution failed due to an exception";
const REVERT_EXCEPTION_MSG = "revert";

describe("Candidates place stakes using native coin on themselves", () => {
    var minCandidateStake;
    var minCandidateStakeBN;
    var minDelegatorStake;
    var minDelegatorStakeBN;
    const delegatorsNumber = 10;
    var delegators = [];

    before(async () => {
        // this is min stake per a CANDIDATE
        minCandidateStake = await StakingAuRa.instance.methods
            .candidateMinStake()
            .call();
        minDelegatorStake = await StakingAuRa.instance.methods
            .delegatorMinStake()
            .call();
        minCandidateStakeBN = new BN(minCandidateStake.toString());
        minDelegatorStakeBN = new BN(minDelegatorStake.toString());

        console.log("**** Delegator addresses are generated");
        for (let i = 0; i < delegatorsNumber; i++) {
            let acc = web3.eth.accounts.create();
            let keystoreObj = web3.eth.accounts.encrypt(
                acc.privateKey,
                "testnetpoa"
            );
            delegators.push(acc.address);
            fs.writeFileSync(
                path.join(
                    __dirname,
                    "../accounts/keystore",
                    acc.address.substring(2).toLowerCase() + ".json"
                ),
                JSON.stringify(keystoreObj),
                "utf8"
            );
        }
    });

    it("Candidates add pools for themselves", async () => {
        let stakeBN = minCandidateStakeBN.clone();
        console.log("**** stake = " + stakeBN.toString());
        for (candidate of constants.CANDIDATES) {
            console.log("**** candidate =", JSON.stringify(candidate));
            let poolId =
                (await ValidatorSetAuRa.instance.methods.lastPoolId().call()) -
                0 +
                1;
            let candidatePoolId = await ValidatorSetAuRa.instance.methods
                .idByStakingAddress(candidate.staking)
                .call();
            let iStake = await StakingAuRa.instance.methods
                .stakeAmount(
                    candidatePoolId,
                    "0x0000000000000000000000000000000000000000"
                )
                .call();
            let iStakeBN = new BN(iStake.toString());
            let poolName = `Pool ${poolId}`;
            let poolDescription = `Pool ${poolId} description`;
            let tx = await sendInStakingWindow(web3, async () => {
                const latestBlock = await getLatestBlock(web3);
                return SnS(
                    web3,
                    {
                        from: candidate.staking,
                        to: StakingAuRa.address,
                        value: stakeBN.toString(), // Send native coins as stake
                        method: StakingAuRa.instance.methods.addPool(
                            "0",
                            candidate.mining,
                            poolName,
                            poolDescription
                        ), // _amount ignored for native coins
                        gasPrice: "1000000000", // maxPriorityFeePerGas for EIP-1559, maxFeePerGas is calculated as baseFeePerGas + maxPriorityFeePerGas
                        gasLimit: "700000",
                    },
                    null,
                    latestBlock.baseFeePerGas
                );
            });
            pp.tx(tx);
            expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(
                true
            );
            candidatePoolId = await ValidatorSetAuRa.instance.methods
                .idByStakingAddress(candidate.staking)
                .call();
            let fStake = await StakingAuRa.instance.methods
                .stakeAmount(
                    candidatePoolId,
                    "0x0000000000000000000000000000000000000000"
                )
                .call();
            let fStakeBN = new BN(fStake.toString());
            expect(
                fStakeBN,
                `Stake on candidate ${candidate.staking} didn't increase`
            ).to.be.bignumber.equal(iStakeBN.add(stakeBN));
        }
    });
        it('Candidates place stakes on themselves', async () => {
            let stakeBN = minCandidateStakeBN.clone();
            console.log('**** stake = ' + stakeBN.toString());
            for (candidate of constants.CANDIDATES) {
                console.log('**** candidate =', JSON.stringify(candidate));
                let candidatePoolId = await ValidatorSetAuRa.instance.methods.idByStakingAddress(candidate.staking).call();
                let iStake = await StakingAuRa.instance.methods.stakeAmount(candidatePoolId, '0x0000000000000000000000000000000000000000').call();
                let iStakeBN = new BN(iStake.toString());
                let tx = await sendInStakingWindow(web3, async () => {
                    const latestBlock = await getLatestBlock(web3);
                    return SnS(web3, {
                        from: candidate.staking,
                        to: StakingAuRa.address,
                        value: stakeBN.toString(),  // Send native coins as stake
                        method: StakingAuRa.instance.methods.stake(candidate.staking, '0'),  // _amount ignored for native coins
                        gasPrice: '1000000000', // maxPriorityFeePerGas for EIP-1559, maxFeePerGas is calculated as baseFeePerGas + maxPriorityFeePerGas
                        gasLimit: '400000',
                    }, null, latestBlock.baseFeePerGas, [
                        [
                            ValidatorSetAuRa.address,
                            ["0x0000000000000000000000000000000000000000000000000000000000000016"]
                        ],
                        [
                            StakingAuRa.address,
                            [
                                "0x0000000000000000000000000000000000000000000000000000000000000005",
                                "0x0000000000000000000000000000000000000000000000000000000000000024",
                                "0x000000000000000000000000000000000000000000000000000000000000003A",
                            ]
                        ]
                    ]); // Use EIP-2930 here (and EIP-1559 if supported)
                });
                pp.tx(tx);
                expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);
                let fStake = await StakingAuRa.instance.methods.stakeAmount(candidatePoolId, '0x0000000000000000000000000000000000000000').call();
                let fStakeBN = new BN(fStake.toString());
                expect(fStakeBN, `Stake on candidate ${candidate.staking} didn't increase`).to.be.bignumber.equal(iStakeBN.add(stakeBN));
            }
        });
          it('Delegators place stakes into the second candidate\'s pool', async () => {
                const candidate = constants.CANDIDATES[1].staking;
                const candidatePoolId = await ValidatorSetAuRa.instance.methods.idByStakingAddress(candidate).call();
        
                let promises;
                let nonce;
                let txs;
        
                console.log('**** Owner mints native coins to delegators (4x minStake + 1 ETH)');
        
                const delegatorNativeBN = minDelegatorStakeBN.mul(new BN('4')).add(new BN('1000000000000000000'));
                let latestBlock = await getLatestBlock(web3);
        
                await SnS(web3, {
                    from: OWNER,
                    to: BlockRewardAuRa.address,
                    method: BlockRewardAuRa.instance.methods.setErcToNativeBridgesAllowed([OWNER]),
                    gasPrice: '0'
                });
        
                latestBlock = await getLatestBlock(web3);
        
                promises = [];
                nonce = await web3.eth.getTransactionCount(OWNER);
                for (let i = 0; i < delegatorsNumber; i++) {
                    const delegator = delegators[i];
                    const prm = SnS(web3, {
                        from: OWNER,
                        to: BlockRewardAuRa.address,
                        method: BlockRewardAuRa.instance.methods.addExtraReceiver(delegatorNativeBN.toString(), delegator),
                        gasPrice: '0',
                        nonce: nonce++
                    }, null, latestBlock.baseFeePerGas);
                    promises.push(prm);
                }
                txs = await Promise.all(promises);
                for (const tx of txs) {
                    expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);
                }
        
                for (let i = 0; i < delegatorsNumber; i++) {
                    const delegator = delegators[i];
                    const delegatorBalance = await web3.eth.getBalance(delegator);
                    expect(delegatorBalance, `Amount of minted coins is incorrect for ${delegator}`).to.be.equal(delegatorNativeBN.toString());
                }
        
                console.log('**** Delegators place stakes on the candidate');
        
                latestBlock = await getLatestBlock(web3);
        
                promises = [];
                for (let i = 0; i < delegatorsNumber; i++) {
                    const delegator = delegators[i];
                    const prm = SnS(web3, {
                        from: delegator,
                        to: StakingAuRa.address,
                        value: minDelegatorStakeBN.toString(),  // Send native coins as stake
                        method: StakingAuRa.instance.methods.stake(candidate, '0'),  // _amount ignored for native coins
                        gasPrice: '1000000000', // maxPriorityFeePerGas for EIP-1559, maxFeePerGas is calculated as baseFeePerGas + maxPriorityFeePerGas
                        gasLimit: '400000'
                    }, null, latestBlock.baseFeePerGas);
                    promises.push(prm);
                }
                txs = await Promise.all(promises);
                for (const tx of txs) {
                    expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);
                }
        
                for (let i = 0; i < delegatorsNumber; i++) {
                    const fStake = await StakingAuRa.instance.methods.stakeAmount(candidatePoolId, delegators[i]).call();
                    const fStakeBN = new BN(fStake.toString());
                    expect(fStakeBN, `Stake on candidate ${candidate} didn't increase`).to.be.bignumber.equal(minDelegatorStakeBN);
                }
        
                // Test moving of stakes
                console.log('**** One of delegators moves their stake to another candidate');
                let candidate_rec = constants.CANDIDATES[2].staking;
                let candidate_rec_id = await ValidatorSetAuRa.instance.methods.idByStakingAddress(constants.CANDIDATES[2].staking).call();
                let delegator = delegators[0];
        
                // initial stake on the initial candidate
                let iStake = await StakingAuRa.instance.methods.stakeAmount(candidatePoolId, delegator).call();
                let iStakeBN = new BN(iStake.toString());
        
                // initial stake on the target candidate
                let iStake_rec = await StakingAuRa.instance.methods.stakeAmount(candidate_rec_id, delegator).call();
                let iStake_recBN = new BN(iStake_rec.toString());
        
                let tx = await SnS(web3, {
                    from: delegator,
                    to: StakingAuRa.address,
                    method: StakingAuRa.instance.methods.moveStake(candidate, candidate_rec, minDelegatorStakeBN.toString()),  // _amount set for native coins
                    gasPrice: await calcMinGasPrice(web3),
                    gasLimit: '500000',
                });
                expect(tx.status, `Tx to move stake failed: ${tx.transactionHash}`).to.equal(true);
        
                // final stake on the initial candidate (should have decreased)
                let fStake = await StakingAuRa.instance.methods.stakeAmount(candidatePoolId, delegator).call();
                let fStakeBN = new BN(fStake.toString());
                let dStakeBN = fStakeBN.sub(iStakeBN);
                expect(dStakeBN, `Stake on initial candidate ${candidate} didn't decrease`).to.be.bignumber.equal(minDelegatorStakeBN.neg()); // x.neg() == -x
        
                // final stake on the target candidate (should have increased)
                let fStake_rec = await StakingAuRa.instance.methods.stakeAmount(candidate_rec_id, delegator).call();
                let fStake_recBN = new BN(fStake_rec.toString());
                let dStake_recBN = fStake_recBN.sub(iStake_recBN);
                expect(dStake_recBN, `Stake on target candidate ${candidate_rec} didn't increase`).to.be.bignumber.equal(minDelegatorStakeBN);
        
                console.log('**** Moving stake must fail if delegator tries to move their stake to the same candidate');
                try {
                    let tx2 = await SnS(web3, {
                        from: delegator,
                        to: StakingAuRa.address,
                        method: StakingAuRa.instance.methods.moveStake(candidate_rec, candidate_rec, minDelegatorStakeBN.toString()),
                        gasPrice: await calcMinGasPrice(web3),
                        gasLimit: '500000',
                    });
                    expect(false, `Tx didn't throw an exception: ${tx2.transactionHash}. Tx status: ${tx2.status}`).to.equal(true);
                }
                catch (e) {
                    const eString = e ? e.toString() : '';
                    expect(e && (eString.includes(FAILED_EXCEPTION_MSG) || eString.includes(REVERT_EXCEPTION_MSG)), `Tx threw an unexpected exception: ` + eString).to.equal(true);
                }
        
                console.log('**** Delegator can\'t move more staking tokens than one has');
                try {
                    let tx3 = await SnS(web3, {
                        from: delegator,
                        to: StakingAuRa.address,
                        method: StakingAuRa.instance.methods.moveStake(candidate, candidate_rec, minDelegatorStakeBN.toString()),
                        gasPrice: await calcMinGasPrice(web3),
                        gasLimit: '500000',
                    });
                    expect(false, `Tx didn't throw an exception: ${tx3.transactionHash}. Tx status: ${tx3.status}`).to.equal(true);
                }
                catch (e) {
                    const eString = e ? e.toString() : '';
                    expect(e && (eString.includes(FAILED_EXCEPTION_MSG) || eString.includes(REVERT_EXCEPTION_MSG)), `Tx threw an unexpected exception: ` + eString).to.equal(true);
                }
            });
            
});
