# POSDAO test setup

This is an integration test of AuRa POSDAO with seven Nethermind nodes running locally from the genesis block.


## Nethermind client setup

To integrate with [Nethermind](https://github.com/NethermindEth/nethermind), the following structure of folders is assumed:
```
.
├── nethermind
├── posdao-test-setup
```
So there should be two folders on the same level and `posdao-test-setup` will use a binary from the `nethermind` folder, namely the binary is assumed to be at `../nethermind/bin/Nethermind.Runner` relative to `posdao-test-setup` root.

A pre-compiled binary can be downloaded from the [releases page](https://github.com/NethermindEth/nethermind/releases) (versions >= v1.12.7 are supported). You need to maintain directory structure and naming conventions:
```bash
# move up from posdao-test-setup root
$ cd ..
$ mkdir -p nethermind/bin
# an example for Linux binary
$ curl -SfL '[REPLACE WITH GITHUB URL]' -o nethermind/bin/nethermind.zip
$ unzip nethermind/bin/nethermind.zip -d nethermind/bin
$ chmod +x nethermind/bin/Nethermind.Runner
# check that it works and version is correct (compare the version from the binary with version on the release page)
$ nethermind/bin/Nethermind.Runner --version
```

In MacOS, you may need to allow execution of the binary in System Preferences -> Security & Privacy.


## Usage (+ Testing)

After cloning the repo(PoSDAO test setup), clone PoS-contracts:
```bash
$ git clone https://github.com/SCV-Soft/PoS-contracts
```
and install dependencies:
```bash
$ npm install
```
and build the contracts:
```bash
$ forge build --quiet
```

Then, return to the `posdao-test-setup` folder:
```bash
$ cd ..
```
Now, install dependencies for the test setup:
```bash
$ npm install
```
Then, run make-spec.js to generate the test setup configuration files:
```bash
$ npm run make-spec
``` 
**IMPORTANT**: Before starting the test setup, please make sure to edit the spec.json in the data folder to set the correct value.
```json
"randomnessContractAddress": {
    "2": "0x3000000000000000000000000000000000000001" // it should be "2", not "0"
},
```
To start the test setup, simply run:
```bash
$ npm run start-test-setup-nethermind
```
This will start seven Nethermind nodes with AuRa POSDAO consensus from the genesis block. To run test, run ``npm run test``.



## Simulation

We've created a [NetLogo model](./simulation/README.md) for simulating the
staking and rewards computation on networks of various sizes and having
different input parameters.
