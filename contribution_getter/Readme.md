# Contribution-getter

A contribution-getter tool for a crowdloan campaign. Contributions are stored in a child-trie and this tool helps retriving the information of the contributors and amount contributed. 

## Install dependencies
From this directory

`npm install`

## Run the fast script
We are speaking about the contribution-getter script. The script accepts three inputs fields:
- `--parachain-id or -p`, which specifies the parachain id associated with the crowdloan from which we want to retrieve contributions
- `--ws-provider or -w`, which specifies the websocket provider to which we will be issuing our requests
- `--output-dir or -o`, which specifies the output directory where we want to store our result JSON object

### Example
`npm run contribution-getter -- --parachain-id 2001 --ws-provider "ws://127.0.0.1:3333" -o "./contributions.json"`

## Run the slow and safe script
We are speaking about the contribution-getter-safe script. The script accepts several inputs fields:
- `--parachain-id or -p`, which specifies the parachain id associated with the crowdloan from which we want to retrieve contributions
- `--ws-provider or -w`, which specifies the websocket provider to which we will be issuing our requests
- `--output-dir or -o`, which specifies the output directory where we want to store our result JSON object
- `--mandatory-memo-length or -m`, which specifies the length in bytes that the memo should have
- `--aux-to-verify-memo-data or -x`, which accepts as input a json file with mappings Relay address -> parachain address. The script verifies that these mappings are correct when reading the memo
- `--subscan-url or -s`, if this parameter is present, then the script will also look for the memo in subscan and verify that both the memo in subscan and the one read from storage are identical

### Example
`npm run contribution-getter -- --parachain-id 2001 --ws-provider "ws://127.0.0.1:3333" -o "./contributions.json"`

yarn run contribution-getter --parachain-id 2023 -w wss://kusama-rpc.polkadot.io -o moonriver.json -m 20 -x aux_memo_data_to_verify.json -s https://kusama.subscan.io/api/open/account/extrinsics
### Output format
```json
{
  "total_raised": "300000000000000",
  "contributions": [
    {
      "account": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      "contribution": "100000000000000",
      "memo": ""
    },
    {
      "account": "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      "contribution": "200000000000000",
      "memo": "
    }
  ],
  "parachain_id": 2001
}
```
