// const Web3 = require('web3');
// const fs = require('fs');
// const path = require('path');
// const constants = require('../utils/constants');
// const SnS = require('../utils/signAndSendTx.js');
// const web3 = new Web3('http://localhost:8541');
// web3.eth.transactionConfirmationBlocks = 1;
// const BN = web3.utils.BN;
// const OWNER = constants.OWNER;
// const expect = require('chai')
//     .use(require('chai-bn')(BN))
//     .use(require('chai-as-promised'))
//     .expect;
// const ValidatorSetAuRa = require('../utils/getContract')('ValidatorSetAuRa', web3);
// const StakingAuRa = require('../utils/getContract')('StakingAuRa', web3);
// const waitForValidatorSetChange = require('../utils/waitForValidatorSetChange');
// const waitForNextStakingEpoch = require('../utils/waitForNextStakingEpoch');
// const calcMinGasPrice = require('../utils/calcMinGasPrice');
// const pp = require('../utils/prettyPrint');

// describe('Pool removal and validator set change', () => {
//     let tiredValidator = {};

//     it('The last validator removes his pool', async function () {
//         // `removeMyPool()` reverts for an initial validator during the initial staking epoch (stakingEpoch == 0).
//         // On a fresh chain the first tests often run while stakingEpoch is still 0, so we wait until it advances.
//         const currentStakingEpoch = parseInt(await StakingAuRa.instance.methods.stakingEpoch().call(), 10);
//         if (currentStakingEpoch === 0) {
//             console.log('***** stakingEpoch is 0 (initial epoch). Waiting for the next staking epoch before removing a pool...');
//             await waitForNextStakingEpoch(web3);
//         }

//         let validators = await ValidatorSetAuRa.instance.methods.getValidators().call();
//         console.log('***** Initial validator set = ' + JSON.stringify(validators));
//         if (validators.length < 2) {
//             console.log('***** Skip: requires at least 2 validators in the validatorSet');
//             this.skip();
//         }

//         tiredValidator.mining = validators[validators.length - 1];
//         tiredValidator.staking = await ValidatorSetAuRa.instance.methods.stakingByMiningAddress(tiredValidator.mining).call();
//         console.log('***** Validator to be removed: ' + JSON.stringify(tiredValidator));
//         await ensureHasGasFunds(tiredValidator.staking);
//         const tx = await SnS(web3, {
//             from: tiredValidator.staking,
//             to: StakingAuRa.address,
//             method: StakingAuRa.instance.methods.removeMyPool(),
//             gasPrice: await calcMinGasPrice(web3),
//             gasLimit: '300000',
//         });
//         pp.tx(tx);
//         expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);
//     });

//     it('Validator is not present in the validator set in the next staking epoch', async function () {
//         if (!tiredValidator || !tiredValidator.mining) {
//             console.log('***** Skip: previous test did not run');
//             this.skip();
//         }
//         console.log('***** Wait for staking epoch to change');
//         let validators = (await waitForValidatorSetChange(web3)).map(v => v.toLowerCase());
//         let validatorIndex = validators.indexOf(tiredValidator.mining.toLowerCase());
//         expect(validatorIndex, `Validator ${JSON.stringify(tiredValidator)}
//             removed his pool but still is in validator set`)
//             .to.equal(-1);
//     });
// });

// describe('Unremovable validator removes his pool', () => {
//     let unremovableValidator = {};

//     it('Owner calls ValidatorSetAuRa.clearUnremovableValidator', async () => {
//         unremovableValidator.poolId = await ValidatorSetAuRa.instance.methods.unremovableValidator().call();
//         unremovableValidator.staking = (await ValidatorSetAuRa.instance.methods.stakingAddressById(unremovableValidator.poolId).call()).toLowerCase();
//         unremovableValidator.mining = (await ValidatorSetAuRa.instance.methods.miningAddressById(unremovableValidator.poolId).call()).toLowerCase();

//         if (unremovableValidator.poolId == '0') {
//             console.log('***** Unremovable validator doesn\'t exist. Skip this test');
//             return;
//         }

//         const validatorsList = await ValidatorSetAuRa.instance.methods.getValidators().call();
//         expect(validatorsList[0].toLowerCase() == unremovableValidator.mining, `Unexpected unremovable validator mining: ${validatorsList[0]}, actual mining: ${unremovableValidator.mining}`)
//             .to.equal(true);

//         console.log('***** Unremovable validator: ' + JSON.stringify(unremovableValidator));
//         console.log('***** OWNER calls clearUnremovableValidator');
//         const tx = await SnS(web3, {
//             from: OWNER,
//             to: ValidatorSetAuRa.address,
//             method: ValidatorSetAuRa.instance.methods.clearUnremovableValidator(),
//             gasPrice: await calcMinGasPrice(web3),
//             gasLimit: '300000',
//         });
//         pp.tx(tx);
//         expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);

//         const check_unremovableValidator = await ValidatorSetAuRa.instance.methods.unremovableValidator().call();
//         console.log('***** ValidatorSetAuRa.unremovableValidator after the call: ' + check_unremovableValidator);
//         expect(check_unremovableValidator == '0', 'Unremovable validator is not cleared')
//             .to.equal(true);
//     });

//     it('Ex unremovable validator removes his pool', async() => {
//         if (unremovableValidator.poolId == '0') {
//             console.log('***** Unremovable validator doesn\'t exist. Skip this test');
//             return;
//         }

//         const currentStakingEpoch = parseInt(await StakingAuRa.instance.methods.stakingEpoch().call(), 10);
//         if (currentStakingEpoch === 0) {
//             console.log('***** stakingEpoch is 0 (initial epoch). Waiting for the next staking epoch before removing a pool...');
//             await waitForNextStakingEpoch(web3);
//         }

//         const validatorsBefore = (await ValidatorSetAuRa.instance.methods.getValidators().call()).map(v => v.toLowerCase());
//         const unremovableMining = unremovableValidator.mining.toLowerCase();
//         const hadOtherValidatorsBeforeRemoval = validatorsBefore.some(v => v !== unremovableMining);

//         console.log('***** Ex unremovable validator calls StakingAuRa.removeMyPool');
//         await ensureHasGasFunds(unremovableValidator.staking);
//         const tx = await SnS(web3, {
//             from: unremovableValidator.staking,
//             to: StakingAuRa.address,
//             method: StakingAuRa.instance.methods.removeMyPool(),
//             gasPrice: await calcMinGasPrice(web3),
//             gasLimit: '300000',
//         });
//         pp.tx(tx);
//         expect(tx.status, `Failed tx: ${tx.transactionHash}`).to.equal(true);

//         const pools = await StakingAuRa.instance.methods.getPools().call();
//         const poolFound = pools.filter(pool => pool == unremovableValidator.poolId).length > 0;
//         expect(poolFound, 'Unremovable validator\'s pool still exists').to.equal(false);

//         const validatorsList = await waitForValidatorSetChange(web3);
//         console.log('***** Validators list after removal = ' + JSON.stringify(validatorsList));
//         const validatorsAfter = validatorsList.map(v => v.toLowerCase());
//         if (hadOtherValidatorsBeforeRemoval) {
//             // Normal case: there was at least one other validator, so this one must be removed.
//             expect(
//                 validatorsAfter.includes(unremovableMining),
//                 `Unremovable validator still present in the validators list`
//             ).to.equal(false);
//         } else {
//             // Edge case: this validator was the last remaining one; the set cannot drop to 0 validators.
//             expect(validatorsAfter.length, 'Unexpected validator set size after pool removal').to.equal(1);
//             expect(validatorsAfter[0], 'Unexpected last validator after pool removal').to.equal(unremovableMining);
//         }
//     });
// });

// async function ensureHasGasFunds(address) {
//     // `removeMyPool()` is sent from the staking address, which may have 0 native balance
//     // (stake is locked in the staking contract, but gas still must be paid from EOA balance).
//     const minBalanceWei = new BN(web3.utils.toWei('0.01', 'ether')); // generous cushion for repeated reruns
//     const balanceWei = new BN(await web3.eth.getBalance(address));
//     if (balanceWei.gte(minBalanceWei)) {
//         return;
//     }

//     const topUpWei = minBalanceWei.sub(balanceWei);
//     console.log(`***** Funding ${address} with ${topUpWei.toString()} wei to cover gas`);
//     const tx = await SnS(web3, {
//         from: OWNER,
//         to: address,
//         value: topUpWei.toString(),
//         gasPrice: await calcMinGasPrice(web3),
//         gasLimit: '21000',
//     });
//     pp.tx(tx);
//     expect(tx.status, `Failed top-up tx: ${tx.transactionHash}`).to.equal(true);
// }
