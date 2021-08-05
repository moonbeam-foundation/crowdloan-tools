// Import
import { ApiPromise, WsProvider } from "@polkadot/api";
import { MultiSignature } from "@polkadot/types/interfaces";
import yargs from "yargs";
import { Keyring } from "@polkadot/api";


const args = yargs.options({
  "parachain-id": { type: "number", demandOption: true, alias: "p" },
  "ws-provider": { type: "string", demandOption: true, alias: "w" },
  amount: { type: "string", demandOption: true, alias: "a" },
  signature: { type: "string", demandOption: false, alias: "s" },
  "account-priv-key": { type: "string", demandOption: true, alias: "r" },
  "key-type": { type: "string", demandOption: true, alias: "t" },
}).argv;

// Construct
const wsProvider = new WsProvider(args["ws-provider"]);

async function main() {
  const api = await ApiPromise.create({ provider: wsProvider });

  const keyring = new Keyring({ type: "sr25519" });

  const account = await keyring.addFromUri(
    args["account-priv-key"],
    null,
    args["key-type"]
  );
  const minContribution = Number(
    (await api.consts.crowdloan.minContribution) as any
  );

  // assert the account has enough balance
  let accountBalance = (
    await api.query.system.account(account.address)
  ).toJSON();
  if (accountBalance["data"]["free"] < args["amount"]) {
    throw new Error(`The account does not have enough balance to contribute`);
  }

  if (args["amount"] < minContribution) {
    throw new Error(`The contribution amount is below the minimum`);
  }

  // Is the parachain Id a .toJSON()a parachain already?
  const parachains = (await api.query.paras.parachains()) as any;
  if (parachains.includes(args["parachain-id"])) {
    throw new Error(`The parachain  Id is already a parachain`);
  }
  // First we retrieve the trie index of the parachain-id fund info
  const fund_info = (
    await api.query.crowdloan.funds(args["parachain-id"])
  ).toJSON();
  if (!fund_info) {
    throw new Error(`No crowdloan exists with the provided parachain Id`);
  }

  let verifier = fund_info["verifier"];
  let sig = Object.keys(verifier) as any[0] as any;
  let call;
  if (verifier) {
    if (!args["signature"]) {
      throw new Error(`The crowdloan is set to provide a signature`);
    }
    else {
        let signature = {}
        signature[sig] = args["signature"]
        call = api.tx.crowdloan
        .contribute(args["parachain-id"], args["amount"], signature)
    }
  }
  else {
      call = api.tx.crowdloan
      .contribute(args["parachain-id"], args["amount"], null)
  }


  await new Promise<void>(async (res) => {
    const unsub = await call
      .signAndSend(account, ({ events = [], status, dispatchError }) => {
        console.log(`Current status is ${status.type}`);
        if (status.isInBlock) {
          console.log(
            `Transaction included in Block at blockHash ${status.asInBlock}`
          );
          if (dispatchError) {
            if (dispatchError.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded = api.registry.findMetaError(
                dispatchError.asModule
              );
              const { documentation, name, section } = decoded;

              console.log(`${section}.${name}: ${documentation.join(" ")}`);
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              console.log(dispatchError.toString());
            }
          } else {
            console.log("The extrinsic went through succesfully");
          }

          unsub();
          res();
        } else if (status.isFinalized) {
          console.log(
            `Transaction finalized at blockHash ${status.asFinalized}`
          );

          if (dispatchError) {
            if (dispatchError.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded = api.registry.findMetaError(
                dispatchError.asModule
              );
              const { documentation, name, section } = decoded;

              console.log(`${section}.${name}: ${documentation.join(" ")}`);
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              console.log(dispatchError.toString());
            }
          } else {
            console.log("The extrinsic went through succesfully");
          }

          unsub();
          res();
        }
      });
  });
}
main()
  .catch(console.error)
  .finally(() => process.exit());
