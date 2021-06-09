// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import {u8aToHex} from '@polkadot/util';
import {encodeAddress} from '@polkadot/util-crypto'

import {blake2AsHex} from '@polkadot/util-crypto';
import yargs from 'yargs';
import writeJsonFile from 'write-json-file';
import {getAllContributions, getCrowdloanInfo} from './contribution_getter';

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
      await writeJsonFile(args['output-file'], {
        total_raised: BigInt(data.raised).toString(),
        contributions: [],
        parachain_id: args["parachain-id"]
      });
      return;
    }
    
    const data = await getAllContributions(api, parseInt(args["parachain-id"]));
    // console.log(data)
    await writeJsonFile(args['output-file'], data);
}
main().catch(console.error).finally(() => process.exit());
