# Contribution-inserter

A contribution-inserter tool for a crowdloan campaign in a moonbeam runtime

## Install dependencies
From this directory

`yarn install`

## Run the script
The script accepts three inputs fields:
- `--ws-provider or -w`, which specifies the websocket provider to which we will be issuing our requests
- `--input-dir or -i`, which specifies the input JSON file that we want to use to submit the data
- `--total-fund-dir or -t`, which specifies the total reward amount to distribute
- `--account-priv-key or -a`, which specifies the account that will submit the proposal
- `--end-relay-block or -e`, which specifies the relay block number by which all rewards should be distributed
- `--send-preimage-hash or -h`, boolean specifying whether we want to send the preimage hash
- `--send-proposal or -s`, optional, but if providede needs to be "democracy" or "council-external" specifying whether we want to send the proposal through regular democracy or as an external proposal that will be voted by the council
- `--batch-size or -b`, Optional, number specifying the reward vector batch size. Else we take the maximum from the runtime
- `--collective-threshold or -c`, Optional, number specifying the number of council votes that need to aprove the proposal. If not provided defautls to 1.

### Example to check a proposal hash
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -e 10000`

### Example to note Pre-Image and propose
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -a 0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133 -e 10000 -h true -s democracy`

### Example to note Pre-Image and propose with batch size
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -a 0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133 -e 10000 -h true -s democracy -b 200`

### Example to note Pre-Image and propose through council with batch size
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -a 0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133 -e 10000 -h true -s council-external -b 200 -c 2`