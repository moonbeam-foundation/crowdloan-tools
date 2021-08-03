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
- `--send-proposal or -s`, boolean specifying whether we want to send the proposal to democracy voting

### Example to check a proposal hash
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -e 10000`

### Example to note Pre-Image and propose
`yarn contribution-inserter -w ws://127.0.0.1:34112 -i contribution_data/moonriver_data.json -t 3000000000000000000000000 -a 0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133 -e 10000 -h true -s true`
