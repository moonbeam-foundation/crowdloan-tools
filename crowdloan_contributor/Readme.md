# Crowdloan-contributor

A crowdloan-contributor that provided a parachain-id and an amount, it contributes to the crowdloan fund of that parachain if it exists.

## Install dependencies
From this directory

`yran install`

## Run the fast script
We are speaking about the contribution-getter script. The script accepts three inputs fields:
- `--parachain-id or -p`, which specifies the parachain id associated with the crowdloan from which we want to retrieve contributions
- `--ws-provider or -w`, which specifies the websocket provider to which we will be issuing our requests
- `--amount or -a`, which specifies the amount to contribute
- `--signature or -s`, which specifies the signature of the crowdloan
- `--account-priv-key or -r`, the contributor address
- `--key type or -t`, which needs to be one of sr25519, ed25519

### Example
`yarn run crowdloan-contribute -w ws://127.0.0.1:34002 -p 2003 -a 3000000000000 -r 0x3cd52fc46b18ecda42014f24f2d75440d72248021360b2e2660b9468d833e16b -t 'sr25519' -s 0x0240bf1e2b0cb5ad8255c4936e051d4b9bbd65ffeca135ae2811e0ca80db4062f8842a9a2749764bd8acd2d4e0f7175c69002292c638cc95ad99f3308fbbef86`


