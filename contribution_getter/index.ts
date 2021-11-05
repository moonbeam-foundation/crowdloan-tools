// Import
import { ApiPromise, WsProvider } from "@polkadot/api";

import yargs from "yargs";
import writeJsonFile from "write-json-file";
import { getAllContributions, getCrowdloanInfo, getCrowdloanKey } from "./contribution_getter";

const args = yargs.options({
    "parachain-id": { type: "number", demandOption: true, alias: "p" },
    "ws-provider": { type: "string", demandOption: true, alias: "w" },
    "output-file": { type: "string", demandOption: true, alias: "o" },
    "only-meta": { type: "boolean", demandOption: false, default: false },
    at: {
        type: "string",
        demandOption: false,
        default: false,
        description: "Block at which to look at",
    },
}).argv;

// Construct
const wsProvider = new WsProvider(args["ws-provider"]);

async function main() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const hash = args["at"]
        ? (await api.rpc.chain.getBlockHash(args["at"])).toString()
        : ((await api.rpc.chain.getHeader()) as any)["parentHash"].toString();

    if (args["only-meta"]) {
        const data = await getCrowdloanInfo(api, parseInt(args["parachain-id"]), hash);

        const crowdloanKey = await getCrowdloanKey(data.trieIndex.toNumber());
        const allKeys = await api.rpc.childstate.getKeys(crowdloanKey, null, hash);

        await writeJsonFile(args["output-file"], {
            total_raised: data.raised.toString(),
            total_contributors: allKeys.length,
            parachain_id: args["parachain-id"],
        });
        return;
    }

    const data = await getAllContributions(api, parseInt(args["parachain-id"]), hash);
    await writeJsonFile(args["output-file"], data);
}
main()
    .catch(console.error)
    .finally(() => process.exit());
