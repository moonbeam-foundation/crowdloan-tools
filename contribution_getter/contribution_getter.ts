// Import
import type { ApiPromise } from "@polkadot/api";
import type { FundInfo } from "@polkadot/types/interfaces/crowdloan";
import { u8aToHex } from "@polkadot/util";
import { encodeAddress, blake2AsHex } from "@polkadot/util-crypto";

export type Contribution = {
    account: string;
    contribution: string;
    memo: string;
};

export type ContributionResult = {
    total_raised: string;
    contributions: Contribution[];
    total_contributors: number;
    parachain_id: number;
};

export async function getCrowdloanInfo(api: ApiPromise, parachainId: number, at: string) {
    return (
        (await (await api.at(at)).query.crowdloan.funds(parachainId)) as any
    ).unwrap() as FundInfo;
}

export async function getCrowdloanKey(trieIndex: number): Promise<string> {
    // Second we calculate the crowdloan key. This is composed of
    // b":child_storage:default:" + blake2_256(b"crowdloan" + trie_index as u32)
    let bytes = new TextEncoder().encode("crowdloan");
    // We allocate 4 bytes for the trie index
    let buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(trieIndex);
    const concatArray = new Uint8Array([...bytes, ...Uint8Array.from(buf)]);
    const childEncodedBytes = u8aToHex(new TextEncoder().encode(":child_storage:default:"));
    return childEncodedBytes + blake2AsHex(concatArray, 256).substring(2);
}

export async function getAllContributions(
    api: ApiPromise,
    parachainId: number,
    at: string
): Promise<ContributionResult> {
    // First we retrieve the trie index of the parachain-id fund info
    const fundInfo = await getCrowdloanInfo(api, parachainId, at);
    const crowdloanKey = await getCrowdloanKey(fundInfo.trieIndex.toNumber());
    const networkPrefix = await api.consts.system.ss58Prefix.toNumber();
    // Third we get all the keys for that particular crowdloan key
    const allKeys = await api.rpc.childstate.getKeys(crowdloanKey, null, at);
    const data: ContributionResult = {
        total_raised: "0",
        contributions: [],
        total_contributors: 0,
        parachain_id: parachainId,
    };
    console.log(`Found keys ${allKeys.length}`);
    // Here we iterate over all the keys that we got for a particular crowdloan key
    const storages = await api.rpc.childstate.getStorageEntries(
        crowdloanKey,
        allKeys.map((i) => i.toHex()),
        at
    );
    console.log(`Found storages ${storages.length}`);
    for (let i = 0; i < storages.length; i++) {
        const storage = storages[i];
        const key = allKeys[i];
        if (storage.isSome) {
            let storage_item = storage.unwrap();
            // The storage item is composed as:
            // Balance (16 bytes with changed endianness)
            // 1 byte memo length
            // Memo
            let balance = BigInt(u8aToHex(storage_item.slice(0, 16).reverse()));
            let memoLenght = storage.unwrap().slice(16, 17);
            let memo = "";
            if (u8aToHex(memoLenght) != "0x00") {
                memo = u8aToHex(storage_item.slice(17, storage_item.length));
            }
            data.contributions.push({
                account: encodeAddress(key.toHex(), networkPrefix),
                contribution: balance.toString(),
                memo: memo,
            });
            data.total_raised = (BigInt(data.total_raised) + balance).toString();
        }
    }
    data.total_contributors = data.contributions.length;
    if (BigInt(data.total_raised) != fundInfo["raised"].toBigInt()) {
        throw new Error(
            `Contributed amount and raised amount dont match(expected: ${fundInfo["raised"]}, actual: ${data.total_raised}})`
        );
    }
    return data;
}
