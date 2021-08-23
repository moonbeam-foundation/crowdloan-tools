// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundle } from "moonbeam-types-bundle";
import { formatBalance } from "@polkadot/util";

import type { SubmittableExtrinsic } from "@polkadot/api/promise/types";
import {blake2AsHex} from '@polkadot/util-crypto';
import yargs from 'yargs';
import loadJsonFile from 'load-json-file';
import { Keyring } from "@polkadot/api";

const args = yargs.options({
    'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    'account-priv-key': {type: 'string', demandOption: true, alias: 'a'},
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
    const api = await ApiPromise.create({ provider: wsProvider , typesBundle: typesBundle as any});

    const keyring = new Keyring({ type: "ethereum" });

    const account =  await keyring.addFromUri(args['account-priv-key'], null, "ethereum");
    const { nonce: rawNonce, data: balance } = await api.query.system.account(account.address);
    let nonce = BigInt(rawNonce.toString());

    let prefixes = generateStorageKeyPrefixArray();

    for (const prefix of prefixes) {
        // NOTE: We use 1 here which will cause weight to be lower than it should be. We could
        //       query storage one way or another to calculate this value. Substrate dosen't
        //       enforce this value, however, so we're OK as long as our block doesn't go
        //       overweight.
        const call = api.tx.system.killPrefix(prefix, 1);

        await api.tx.sudo.sudo(call)
            .signAndSend(account, { nonce });
        nonce++;
    }
}

main().catch(console.error).finally(() => process.exit());

