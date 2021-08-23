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
    // 'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    // 'end-relay-block': {type: 'number', demandOption: true, alias: 'e'},
    // 'account-priv-key': {type: 'string', demandOption: false, alias: 'a'},
  }).argv;

// Construct
const wsProvider = new WsProvider(args['ws-provider']);

// Create an array of prefixes that we wish to destroy, but keep each to a small subset of
// storage that can be removed in a single block. For most items, this can be the storage prefix
// for the entire storage item, but for both AccountsPayable and ClaimedRelayChainIds, this
// needs to be broken down into smaller subsets.
//
// We accomplish this by appending each unique hex character (right? or will we have to do a
// full byte?) to the end of these storage items.
function generateStorageKeyPrefixArray() {

    // two-x hashes used to construct storage keys
    const crowdloanRewardsTwox = "54f9db3490626a75fb6ecd4b909679f0"; // twox128("CrowdloanRewards")
    const accountsPayableTwox = "fe9e8cb09dfbe0fb8190134325b5986d"; // twox128("AccountsPayable")
    const claimedRelayChainIdsTwox = "73bd12fcf191cd6aef601cbdaa8c55c6"; // twox128("ClaimedRelayChainIds")
    const unassociatedContributionsTwox = "6c92b7138c926389029a5157da663155"; // twox128("UnassociatedContributions")
    const initializedTwox = "fa92de910a7ce2bd58e99729c69727c1"; // twox128("Initialized")
    const initRelayBlockTwox = "15fa8419872debb6e5b60e1092ad4569" // twox("InitRelayBlock")
    const endRelayBlockTwox = "887071ec506cf27113b575feb9e25282" // twox("EndRelayBlock")
    const initializedRewardAmountTwox = "9f42641485b63a10f55b769103ad37f3" // twox("InitializedRewardAmount")
    const totalContributorsTwox = "0a9d68a674025036a11d29c75834467a" // twox("TotalContributors")

    const nibbles = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    let prefixes = [];
    prefixes.push(crowdloanRewardsTwox + unassociatedContributionsTwox);
    prefixes.push(crowdloanRewardsTwox + initializedTwox);
    prefixes.push(crowdloanRewardsTwox + initRelayBlockTwox);
    prefixes.push(crowdloanRewardsTwox + endRelayBlockTwox);
    prefixes.push(crowdloanRewardsTwox + initializedRewardAmountTwox);
    prefixes.push(crowdloanRewardsTwox + totalContributorsTwox);

    for (const nibble of nibbles) {
        prefixes.push(crowdloanRewardsTwox + accountsPayableTwox + nibble);
        prefixes.push(crowdloanRewardsTwox + claimedRelayChainIdsTwox + nibble);
    }

    console.log("PREFIXES: ", prefixes);

    return prefixes;
}

async function main () {
    // const api = await ApiPromise.create({ provider: wsProvider , typesBundle: typesBundle as any});

    // const keyring = new Keyring({ type: "ethereum" });

    let prefixes = generateStorageKeyPrefixArray();

    /*
    let claimedAsBalance = formatBalance(args["total-fund"], { withSi: true, withUnit: "Unit" }, 18);
    console.log("We are going to distribute %s", claimedAsBalance)

    let contributors = await loadJsonFile(args['input-dir']);
    let toDistribute =  BigInt(args["total-fund"]);
    let contributions = contributors["contributions"];
    
    let total = BigInt(0);
    let total_contributions = BigInt(contributors['total_raised']);
    
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
            if (temporary[k]["memo"].length != 0) {
                reward_vec.push([u8aToHex(decodeAddress(temporary[k]["account"])), temporary[k]["memo"], temporary[k]["associated_reward"]])
            }
            else {
                console.log("Pushing unassociated")
                reward_vec.push([u8aToHex(decodeAddress(temporary[k]["account"])), null, temporary[k]["associated_reward"]])
            }
        }
        calls.push(
            api.tx.crowdloanRewards.initializeRewardVec(reward_vec)
        )
        total_length += temporary.length;
    }
    calls.push(api.tx.crowdloanRewards.completeInitialization(args["end-relay-block"]));
    
    const account =  await keyring.addFromUri(args['account-priv-key'], null, "ethereum");
    const { nonce: rawNonce, data: balance } = await api.query.system.account(account.address);
    let nonce = BigInt(rawNonce.toString());

    for (let i = 0; i < calls.length; i++) {

        // We just prepare the proposals
        let encodedProposal = (calls[i] as SubmittableExtrinsic)?.method.toHex() || "";
        let encodedHash = blake2AsHex(encodedProposal);

        if (i == calls.length -1) {
            console.log("Encoded proposal hash for complete is %s", i, encodedHash);
        }
        else {
           console.log("Encoded proposal hash for calls %d is %s", i, encodedHash);
        }
        console.log("Encoded length %d", encodedProposal.length);

        if (args["send-preimage-hash"]) {
            await api.tx.democracy
            .notePreimage(encodedProposal)
            .signAndSend(account, { nonce });
            nonce++;

            if (args["send-proposal-as"] == 'democracy') {
                await api.tx.democracy
                .propose(encodedHash, PROPOSAL_AMOUNT)
                .signAndSend(account, { nonce: nonce });
                nonce++;
            }
            else if (args["send-proposal-as"] == 'council-external') {
                let external =  api.tx.democracy.externalProposeMajority(encodedHash)
                
                await api.tx.councilCollective
                .propose(collectiveThreshold, external, external.length)
                .signAndSend(account, { nonce: nonce });
                nonce++;
            }
        }
    }
*/
}

main().catch(console.error).finally(() => process.exit());

