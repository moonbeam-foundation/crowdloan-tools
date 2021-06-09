// Import
import { ApiPromise, WsProvider } from '@polkadot/api';

import yargs from 'yargs';
import writeJsonFile from 'write-json-file';
import {getAllContributions, getCrowdloanInfo, getCrowdloanKey} from './contribution_getter';

const args = yargs.options({
    'parachain-id': { type: 'number', demandOption: true, alias: 'p' },
    'ws-provider': {type: 'string', demandOption: true, alias: 'w'},
    'output-file': {type: 'string', demandOption: true, alias: 'o'},
    'only-meta': {type: 'boolean', demandOption: false, default: false}
  }).argv;

// Construct
const wsProvider = new WsProvider(args['ws-provider']);

async function main () {
    const api = await ApiPromise.create({ provider: wsProvider });

    if (args['only-meta']) {
      const data = await getCrowdloanInfo(api, parseInt(args["parachain-id"]));
      
      const crowdloanKey = await getCrowdloanKey(api, data.trieIndex);
      const allKeys = await api.rpc.childstate.getKeys(crowdloanKey, null);
      
      console.log(data);
      await writeJsonFile(args['output-file'], {
        total_raised: BigInt(data.raised).toString(),
        total_contributors: allKeys.length,
        parachain_id: args["parachain-id"]
      });
      return;
    }

    const data = await getAllContributions(api, parseInt(args["parachain-id"]));
    // console.log(data)
    await writeJsonFile(args['output-file'], data);
}
main().catch(console.error).finally(() => process.exit());
