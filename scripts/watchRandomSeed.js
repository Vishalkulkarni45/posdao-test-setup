/*
    - RandomAuRa.currentSeed (value should change every RandomAuRa.collectRoundLength() blocks)
*/

const path = require('path');
const Web3 = require('web3');
const os = require('os');
const fs = require('fs');

const web3 = new Web3('http://localhost:8541');
const BN = web3.utils.BN;

const checkIntervalMS = 2539; // should be less than block time

const node1Path = '../data/node1/';
const checkLogFileName = path.join(__dirname, `${node1Path}/checkRandomSeed.log`);
const checkDebugFileName = path.join(__dirname, `${node1Path}/checkRandomSeedDebug.log`);
fs.writeFileSync(checkLogFileName, '', 'utf8');
fs.writeFileSync(checkDebugFileName, '', 'utf8');

const RandomAuRa = require('../utils/getContract')('RandomAuRa', web3).instance;
const ValidatorSetAuRa = require('../utils/getContract')('ValidatorSetAuRa', web3).instance;
let collectRoundLengthBN;
let commitPhaseLengthBN;
let prevBlock;

// Track seed changes per collection round using the same round math as RandomAuRa:
// currentCollectRound = (blockNumber - 1) / collectRoundLength
// commit phase length  = collectRoundLength / 2
// reveal phase starts  = roundStart + commitPhaseLength
let lastSeedBN;
let trackedRoundStartBN;
let trackedRevealStartBN;
let trackedRoundEndBN;
let seedChangedInReveal = false;
let seenRevealBlock = false;

// utility functions:
function appendLine(str) {
    fs.appendFileSync(checkLogFileName, `${new Date().toISOString()} ${str}${os.EOL}`, 'utf8');
}

function appendDebug(str) {
    fs.appendFileSync(checkDebugFileName, `${new Date().toISOString()} ${str}${os.EOL}`, 'utf8');
}

async function wait(ms) {
    await new Promise(r => setTimeout(r, ms));
}

function calcRoundBounds(blockNumberBN) {
    // roundStart = floor((block-1)/L)*L + 1
    const roundIndexBN = blockNumberBN.subn(1).div(collectRoundLengthBN);
    const roundStartBN = roundIndexBN.mul(collectRoundLengthBN).addn(1);
    const revealStartBN = roundStartBN.add(commitPhaseLengthBN);
    const roundEndBN = roundStartBN.add(collectRoundLengthBN).subn(1);
    return { roundStartBN, revealStartBN, roundEndBN };
}

function doCheck() {
    Promise.all([
        web3.eth.getBlock('latest', false),
        RandomAuRa.methods.currentSeed().call(),
        ValidatorSetAuRa.methods.getValidators().call(),
    ]).then(results => {
        let block = results[0];
        if (block.number == prevBlock) return;
        prevBlock = block.number;
        const blockNumberBN = new BN(block.number.toString());
        const seed = new BN(results[1]);
        const validators = results[2];

        const { roundStartBN, revealStartBN, roundEndBN } = calcRoundBounds(blockNumberBN);

        // Detect round transition and validate previous round
        if (!trackedRoundStartBN || !roundStartBN.eq(trackedRoundStartBN)) {
            if (trackedRoundStartBN && seenRevealBlock && !seedChangedInReveal) {
                appendLine(
                    `[${trackedRoundEndBN.toString()}]: report: seed didn't change during reveal phase ` +
                    `(roundStart=${trackedRoundStartBN.toString()}, revealStart=${trackedRevealStartBN.toString()}, roundEnd=${trackedRoundEndBN.toString()})`
                );
            }
            trackedRoundStartBN = roundStartBN;
            trackedRevealStartBN = revealStartBN;
            trackedRoundEndBN = roundEndBN;
            seedChangedInReveal = false;
            seenRevealBlock = false;
        }

        const isRevealPhase = blockNumberBN.gte(trackedRevealStartBN) && blockNumberBN.lte(trackedRoundEndBN);
        if (isRevealPhase) {
            seenRevealBlock = true;
        }

        let reportReason = '';
        if (lastSeedBN && !seed.eq(lastSeedBN)) {
            if (blockNumberBN.lt(trackedRevealStartBN)) {
                reportReason =
                    `seed changed during commit phase, previous value: ${lastSeedBN}, current value: ${seed}, ` +
                    `roundStart=${trackedRoundStartBN.toString()}, revealStart=${trackedRevealStartBN.toString()}, roundEnd=${trackedRoundEndBN.toString()}`;
                appendLine(`[${block.number}]: report: ${reportReason}`);
            } else {
                seedChangedInReveal = true;
            }
        }

        const author = block.author || block.miner;
        appendDebug(
            `[${block.number}]: seed=${seed} author=${author} ` +
            `validators=${validators.join(',')} ` +
            `roundStart=${trackedRoundStartBN.toString()} revealStart=${trackedRevealStartBN.toString()} roundEnd=${trackedRoundEndBN.toString()} ` +
            `phase=${isRevealPhase ? 'reveal' : 'commit'} report=${reportReason}`
        );

        lastSeedBN = seed;
    }).catch(e => {
        appendLine(`exception occured: ${e}`);
    });
}


async function main() {
    // initially wait until round parameters are initialized
    while (true) {
        try {
            const [_crl, _cpl] = await Promise.all([
                RandomAuRa.methods.collectRoundLength().call(),
                RandomAuRa.methods.commitPhaseLength().call(),
            ]);
            if (_crl && _crl !== '0' && _cpl && _cpl !== '0') {
                collectRoundLengthBN = new BN(_crl);
                commitPhaseLengthBN = new BN(_cpl);
                break;
            }
        } catch (e) {
            // ignore until RPC/contract is ready
        }
        await wait(checkIntervalMS);
    }

    setInterval(doCheck, checkIntervalMS);
}

main();
