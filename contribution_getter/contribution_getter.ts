// Import
import { ApiPromise } from "@polkadot/api";
import { u8aToHex } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";

import { blake2AsHex } from "@polkadot/util-crypto";

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

export type CrowdloanInfo = {
    depositor: string;
    verifier: string;
    deposit: string;
    raised: string;
    end: number;
    cap: string;
    lastContribution: { preEnding: number };
    firstPeriod: number;
    lastPeriod: number;
    trieIndex: number;
};

export async function getCrowdloanInfo(
    api: ApiPromise,
    parachainId: number
): Promise<CrowdloanInfo> {
    return (
        await api.query.crowdloan.funds(parachainId)
    ).toJSON() as CrowdloanInfo;
}

export async function getCrowdloanKey(
    api: ApiPromise,
    trieIndex: number
): Promise<string> {
    // Second we calculate the crowdloan key. This is composed of
    // b":child_storage:default:" + blake2_256(b"crowdloan" + trie_index as u32)
    let bytes = new TextEncoder().encode("crowdloan");
    // We allocate 4 bytes for the trie index
    let buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(trieIndex);
    const concatArray = new Uint8Array([...bytes, ...Uint8Array.from(buf)]);
    const childEncodedBytes = u8aToHex(
        new TextEncoder().encode(":child_storage:default:")
    );
    return childEncodedBytes + blake2AsHex(concatArray, 256).substring(2);
}

export async function getAllContributions(
    api: ApiPromise,
    parachainId: number
): Promise<ContributionResult> {
    // First we retrieve the trie index of the parachain-id fund info
    const fund_info = await getCrowdloanInfo(api, parachainId);
    const crowdloanKey = await getCrowdloanKey(api, fund_info.trieIndex);
    const networkPrefix = await api.consts.system.ss58Prefix.toNumber();
    // Third we get all the keys for that particular crowdloan key
    const allKeys = await api.rpc.childstate.getKeys(crowdloanKey, null);
    const data: ContributionResult = {
        total_raised: "0",
        contributions: [],
        total_contributors: 0,
        parachain_id: parachainId,
    };

    // Here we iterate over all the keys that we got for a particular crowdloan key
    for (const key of allKeys) {
        const storage = await api.rpc.childstate.getStorage(
            crowdloanKey,
            key.toHex()
        );

        if (storage.isSome) {
            let storage_item = storage.unwrap();
            // The storage item is composed as:
            // Balance (16 bytes with changed endianness)
            // 1 byte memo length
            // Memo
            let balance = u8aToHex(storage_item.slice(0, 16).reverse());
            let memoLenght = storage.unwrap().slice(16, 17);
            let memo = "";
            if (u8aToHex(memoLenght) != "0x00") {
                memo = u8aToHex(storage_item.slice(17, storage_item.length));
            }
            data.contributions.push({
                account: encodeAddress(key.toHex(), networkPrefix),
                contribution: balance,
                memo: memo,
            });
            data.total_raised = (
                BigInt(data.total_raised) + BigInt(balance)
            ).toString();
        }
    }
    data.total_contributors = data.contributions.length;
    if (data.total_raised != fund_info["raised"]) {
        throw new Error(
            `Contributed amount and raised amount dont match(expected: ${fund_info["raised"]}, actual: ${data.total_raised}})`
        );
    }
    return data;
}
