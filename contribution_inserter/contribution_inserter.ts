// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import {u8aToHex} from '@polkadot/util';
import {encodeAddress, decodeAddress} from '@polkadot/util-crypto'
import { typesBundle } from "moonbeam-types-bundle";

import {blake2AsHex} from '@polkadot/util-crypto';
import yargs from 'yargs';
import loadJsonFile from 'load-json-file';
import { Keyring } from "@polkadot/api";

const args = yargs.options({
    'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    'input-dir': {type: 'string', demandOption: true, alias: 'i'},
    'total_fund': {type: 'string', demandOption: true, alias: 'a'},
    'sudo_priv_key': {type: 'string', demandOption: true, alias: 'p'},
    'end_relay_block': {type: 'number', demandOption: true, alias: 'e'},
  }).argv;

// Construct
const wsProvider = new WsProvider(args['ws-provider']);

async function main () {
    const api = await ApiPromise.create({ provider: wsProvider , typesBundle: typesBundle as any});
    const chunk = Number(
        (await api.consts.crowdloanRewards.maxInitContributors) as any
    );
    const keyring = new Keyring({ type: "ethereum" });
    const sudoAccount =  await keyring.addFromUri(args['sudo_priv_key'], null, "ethereum");
    let contributors = await loadJsonFile(args['input-dir']);
    let totalRaised = BigInt(contributors["total_raised"]);
    let toDistribute =  BigInt(args["total_fund"]);
    let contributions = contributors["contributions"];
    let nativePerRelay = Number(toDistribute) /Number(totalRaised);
    
    console.log(Number(toDistribute))
    console.log(Number(totalRaised))

    console.log(nativePerRelay)
    let total = BigInt(0);
    let total_2 = 0;
    let total_contributions = BigInt(0);
    for (let i = 0; i < contributions.length; i++) {
        total_contributions = total_contributions + BigInt(contributions[i]["contribution"]);
        
        let assigned = (BigInt(contributions[i]["contribution"]) *toDistribute /totalRaised);
 
        contributions[i]["associated_reward"] = assigned;
        total= total + assigned;

    }
    // For now, and until the runtime is updated, we assume the dust to be accumulated by a dummy account
    if (total != BigInt(toDistribute)) {

        contributions.push({
                account: '5C62Ck4UrFPiBtoCmeSrgF7x9yv9mn38446dhCpsi2mLHiFT',
                contribution: 0,
                memo: '0x0101010101010101010101010101010101010101',
                associated_reward: BigInt(toDistribute)-total
        })
    }
    

    let total_length = 0;
    var i,j, temporary;
    let calls = [];
    for (i = 0,j = contributions.length; i < j; i += chunk) {
        temporary = contributions.slice(i, i + chunk);
        let reward_vec = [];
        for (var k = 0; k < temporary.length; k ++) {
            reward_vec.push([temporary[k]["account"], temporary[k]["memo"], temporary[k]["associated_reward"]])
        }
        console.log(reward_vec.length)
        calls.push(
            api.tx.crowdloanRewards.initializeRewardVec(reward_vec)
        )       
        total_length += temporary.length;
    }
    calls.push(api.tx.crowdloanRewards.completeInitialization(args["end_relay_block"]))
    // Batch them all
    await api.tx.sudo
    .sudo(
      api.tx.utility.batchAll(
          calls
    )
    )
    .signAndSend(sudoAccount);
}

main().catch(console.error).finally(() => process.exit());

