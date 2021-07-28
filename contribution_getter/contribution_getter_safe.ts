// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import {u8aToHex} from '@polkadot/util';
import {encodeAddress, decodeAddress} from '@polkadot/util-crypto'

import {blake2AsHex} from '@polkadot/util-crypto';
import yargs from 'yargs';
import writeJsonFile from 'write-json-file';
import loadJsonFile from 'load-json-file';
import XMLHttpRequest from  'xmlhttprequest';
import assert from 'assert';
import fetch from 'node-fetch';

const args = yargs.options({
    'parachain-id': { type: 'number', demandOption: true, alias: 'p' },
    'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    'output-dir': {type: 'string', demandOption: true, alias: 'o'},
    'address': {type: 'string', demandOption: false, alias: 'a'},
    'mandatory-memo-length': {type: 'number', demandOption: false, alias: 'm'},
    'aux-to-verify-memo-data': {type: 'string', demandOption: false, alias: 'x'},
    'subscan-url': {type: 'string', demandOption: false, alias: 's'}
  }).argv;

// Construct
const wsProvider = new WsProvider(args['ws-provider']);

async function main () {
    const api = await ApiPromise.create({ provider: wsProvider });
    let data_to_verify = {};
    if(args['aux-to-verify-memo-data']) {
        data_to_verify = await loadJsonFile(args['aux-to-verify-memo-data']);
    }
    const { hash, parentHash } = await api.rpc.chain.getHeader();
    // First we retrieve the trie index of the parachain-id fund info
    const fund_info = (await api.query.crowdloan.funds.at(parentHash, args["parachain-id"])).toJSON();

    // Second we calculate the crowdloan key. This is composed of
    // b":child_storage:default:" + blake2_256(b"crowdloan" + trie_index as u32)
    let bytes = new TextEncoder().encode("crowdloan");
    // We allocate 4 bytes for the trie index
    let buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(fund_info["trieIndex"]);
    var array = Uint8Array.from(buf);
    var concatArray = new Uint8Array([ ...bytes, ...array]);
    let child_encoded_bytes = u8aToHex(new TextEncoder().encode(":child_storage:default:"));
    let crowdloan_key = child_encoded_bytes + blake2AsHex(concatArray, 256).substring(2);
    let network_prefix = (await api.consts.system.ss58Prefix.toNumber());
    let all_keys = [];
    if (args["address"]){
        all_keys = await api.rpc.childstate.getKeys(crowdloan_key, u8aToHex(decodeAddress(args["address"])) , parentHash);
    }
    else{
        all_keys = await api.rpc.childstate.getKeys(crowdloan_key, null, parentHash);
    }

    // Third we get all the keys for that particular crowdloan key
    let address_per_movr = {
    };

    // Third we get all the keys for that particular crowdloan key
    let json = {
        "total_raised" : 0,
        "contributions" : [],
        "parachain_id": args["parachain-id"],
    };

    // We have this as a hack, will remove when we have memos
    let known_faulty = ["DAgtn9udZHC7GVU5gV7ybN8nTyucK9PEqY6QvXiG6fEW6TA", "EkmdfH2Fc6XgPgDwMjye3Nsdj27CCSi9np8Kc7zYoCL2S3G"]
    // Here we iterate over all the keys that we got for a particular crowdloan key
    for (let i = 0; i < all_keys.length; i++) {
        const storage = await api.rpc.childstate.getStorage(crowdloan_key, all_keys[i].toHex());
        console.log("Processed %d %", i*100/all_keys.length)
        if (storage.isSome){
            let storage_item = storage.unwrap()
            //console.log(storage_item)
            // The storage item is composed as:
            // Balance (16 bytes with changed endianness)
            // 1 byte memo length
            // Memo

            // The 1 byte memo length is compact-scale-encoded. See https://substrate.dev/docs/en/knowledgebase/advanced/codec
            // This means that if we want (in hex) 40 bytes, which translates to 101000 in binary, scale will encoded it as
            // 1010000. This means that whenever we see 80, the correct length is 40.
            let balance = u8aToHex(storage_item.slice(0,16).reverse())
            let memoLength = storage.unwrap().slice(16,17)
            let memo = "";
            // This is where the memo checks will start
            if (args["mandatory-memo-length"]) {
                
                if(memoLength[0] != args["mandatory-memo-length"] * 4 && !known_faulty.includes(encodeAddress(all_keys[i].toHex(), network_prefix))) {
                    throw new Error(
                        `Wrogn Memo length`
                    );
                }
            }

            if (u8aToHex(memoLength) != "0x00") {
                memo = u8aToHex(storage_item.slice(17,storage_item.length))
            }

            // Data verification against the provided aux json
            if(data_to_verify[encodeAddress(all_keys[i].toHex(), network_prefix)]) {
                assert(data_to_verify[encodeAddress(all_keys[i].toHex(), network_prefix)].toLowerCase() === memo)
            }

            // if subscan-url is provided, then we will additionally compare the memo against the one found in subscan
            // I request 100 tx per account and look for the latest addmemo extrinsic.
            // This 100 should serve to cover the 95% of it
            if(args['subscan-url']) {

                // We take the memo from another side
                const response = await fetch(args['subscan-url'], {
                method: 'POST',
                body: JSON.stringify({
                    "address": encodeAddress(all_keys[i].toHex(), network_prefix),
                    "row": 100
                }),
                headers: {'Content-Type': 'application/json'} });
    
                let json_response = await response.json()
            
                let memo_2 = lookForMemo(json_response, 100, args['parachain-id']);
                // Compare the memos
                if (memo_2) {
                   assert(memo_2 === memo)
                   console.log("Subscan memo Found and is coincident with the substrate storage memo")
                }
            }

            // We get additional data here. How many addresseses pero memo address
            if (address_per_movr[memo.toString()]) {
                address_per_movr[memo.toString()]["number_of_addresses"] += 1
                address_per_movr[memo.toString()]["addresses"].push(encodeAddress(all_keys[i].toHex(), network_prefix))
            }
            else{
                address_per_movr[memo.toString()] = {
                    "number_of_addresses": 1,
                    "addresses": [encodeAddress(all_keys[i].toHex(), network_prefix)]
                }
            }
        
            json.contributions.push({
                "account": encodeAddress(all_keys[i].toHex(), network_prefix),
                "contribution": parseInt(balance, 16),
                "memo": memo
            })
            json.total_raised += parseInt(balance, 16)
        }
    }
    if (!args["address"]){
        if(json.total_raised != fund_info["raised"]){
            throw new Error(
                `Contributed amount and raised amount dont match`
            );
        }
    }
    console.log(json)
    await writeJsonFile(args['output-dir'], json);
    await writeJsonFile('additional_info.json', address_per_movr);
}
main().catch(console.error).finally(() => process.exit());


function lookForMemo(data, limit, paraId) {
    let maximum_inspect = Math.min(limit, data["data"]["count"]);
    // If we find it as an add_memo extrinsic, return here
    for (let i = 0; i < maximum_inspect; i++) {
        if (!data["data"]["extrinsics"][i]["success"]) {
            continue;
        }
        if (data["data"]["extrinsics"][i]["call_module_function"] =='add_memo') {
            let params = data["data"]["extrinsics"][i]["params"];
            if (params[0]["value"] == paraId){
                return "0x" + params[1]["value"]
            }
        }
        // If not found as add_memo, its probably in batch_all.
        else if (data["data"]["extrinsics"][i]["call_module_function"] =='batch_all') {
            let exs = data["data"]["extrinsics"][i]["params"][0]["value"];
            for (let j = 0; j < exs.length; j++) {
                if (exs[j]["call_name"] == 'add_memo') {
                    let params = exs[j]["params"];
                    if (params[0]["value"] == paraId){
                        return "0x" + params[1]["value"]
                    }
                }
            }
        }
    }
}