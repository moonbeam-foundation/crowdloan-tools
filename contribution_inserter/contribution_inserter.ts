// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import {u8aToHex} from '@polkadot/util';
import {encodeAddress, decodeAddress} from '@polkadot/util-crypto'
import { typesBundle } from "moonbeam-types-bundle";
import { formatBalance } from "@polkadot/util";

import type { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import {blake2AsHex} from '@polkadot/util-crypto';
import yargs from 'yargs';
import loadJsonFile from 'load-json-file';
import { Keyring } from "@polkadot/api";

const args = yargs.options({
    'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    'input-dir': {type: 'string', demandOption: true, alias: 'i'},
    'total-fund': {type: 'string', demandOption: true, alias: 't'},
    'end-relay-block': {type: 'number', demandOption: true, alias: 'e'},
    'account-priv-key': {type: 'string', demandOption: false, alias: 'a'},
    'send-preimage-hash': {type: 'boolean', demandOption: false, alias: 'h'},
    'send-proposal': {type: 'boolean', demandOption: false, alias: 's'},
  }).argv;

const PROPOSAL_AMOUNT = 1000000000000000000000n
// Construct
const wsProvider = new WsProvider(args['ws-provider']);

async function main () {
    const api = await ApiPromise.create({ provider: wsProvider , typesBundle: typesBundle as any});
    const chunk = Number(
        (await api.consts.crowdloanRewards.maxInitContributors) as any
    );
    const keyring = new Keyring({ type: "ethereum" });

    let claimedAsBalance = formatBalance(args["total-fund"], { withSi: true, withUnit: "Unit" }, 18);
    console.log("We are going to distribute %s", claimedAsBalance)

    let contributors = await loadJsonFile(args['input-dir']);
    let toDistribute =  BigInt(args["total-fund"]);
    let contributions = contributors["contributions"];
    
    let total = BigInt(0);
    let total_contributions = BigInt(0);

    // Read total first, otherwise we end up having precision errors
    for (let i = 0; i < contributions.length; i++) {
        total_contributions = total_contributions + BigInt(contributions[i]["contribution"]);
    }
    
    // Now we calculate each amount as toDistribute/total_ksm * contribution
    for (let i = 0; i < contributions.length; i++) {
        
        let assigned = (BigInt(contributions[i]["contribution"]) *toDistribute /total_contributions);
 
        contributions[i]["associated_reward"] = assigned;
        total= total + assigned;

    }

    if (BigInt(toDistribute)-total > BigInt(contributions.length)) {
        throw new Error(
            `The dust is bigger than total contributors`
        );
    }
    
    // In here we just batch the calls.
    let total_length = 0;
    var i,j, temporary;
    let calls = [];
    for (i = 0,j = contributions.length; i < j; i += chunk) {
        temporary = contributions.slice(i, i + chunk);
        let reward_vec = [];
        for (var k = 0; k < temporary.length; k ++) {
            reward_vec.push([u8aToHex(decodeAddress(temporary[k]["account"])), temporary[k]["memo"], temporary[k]["associated_reward"]])
        }
        calls.push(
            api.tx.crowdloanRewards.initializeRewardVec(reward_vec)
        )       
        total_length += temporary.length;
    }
    calls.push(api.tx.crowdloanRewards.completeInitialization(args["end-relay-block"]))

    // Batch them all
    const proposal =  api.tx.utility.batchAll(
        calls);

    // We just prepare the proposal
    let encodedProposal = (proposal as SubmittableExtrinsic)?.method.toHex() || "";
    let encodedHash = blake2AsHex(encodedProposal);

    console.log("Encoded proposal hash %s", encodedHash);
    console.log("Encoded length hash %d", encodedProposal.length);

    if (args["send-preimage-hash"]) {
        const account =  await keyring.addFromUri(args['account-priv-key'], null, "ethereum");
        const { nonce: rawNonce1, data: balance } = await api.query.system.account(account.address);
        let nonce = BigInt(rawNonce1.toString());
        let second_nonce = nonce+BigInt(1);
        await api.tx.democracy
        .notePreimage(encodedProposal)
        .signAndSend(account, { nonce });

        if (args["send-proposal"]) {
            await api.tx.democracy
            .propose(encodedHash, PROPOSAL_AMOUNT)
            .signAndSend(account, { nonce: second_nonce });
        }
    }
}

main().catch(console.error).finally(() => process.exit());

