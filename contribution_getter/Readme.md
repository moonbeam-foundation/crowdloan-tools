# Contribution-getter

A contribution-getter tool for a crowdloan campaign. Contributions are stored in a child-trie and this tool helps retriving the information of the contributors and amount contributed. 

## Install dependencies
From this directory

`npm install`

## Run the script
The script accepts three inputs fields:
- `--parachain-id or -p`, which specifies the parachain id associated with the crowdloan from which we want to retrieve contributions
- `--ws-provider or -w`, which specifies the websocket provider to which we will be issuing our requests
- `--output-dir or -o`, which specifies the output directory where we want to store our result JSON object

### Example
`npm run contribution-getter -- --parachain-id 2001 --ws-provider "ws://127.0.0.1:3333" -o "./contributions.json"`

### Output format
```json
{
  total_raised: 300000000000000,
  contributions: [
    {
      account: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      contribution: 100000000000000,
      memo: ''
    },
    {
      account: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      contribution: 200000000000000,
      memo: ''
    }
  ],
  parachain_id: 2001
}
```