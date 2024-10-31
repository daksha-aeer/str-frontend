import { useEffect, useState } from "react";
import {
  Account,
  setupWalletSelector,
  WalletSelector,
} from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";
import { providers } from "near-api-js";
import keccak256 from "keccak256";
import "./App.css";
import { Buffer } from "buffer";

const salt = 12345;

function App() {
  const [selector, setSelector] = useState<WalletSelector>();
  const [account, setAccount] = useState<Account>();
  const [counter, setCounter] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isMining, setIsMining] = useState<boolean>(false);
  const [miningInterval, setMiningInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // const toggleMining = async () => {
  //   if (isMining) {
  //     // Stop mining
  //     console.log("Stopping mining...");
  //     clearInterval(miningInterval!);
  //     setMiningInterval(null);
  //     setIsMining(false);
  //   } else {
  //     console.log("Starting mining...");
  //     setIsMining(true);

  //     // Ensure storage deposit before starting mining
  //     const registered = await checkStorageDeposit();
  //     if (!registered) {
  //       console.log("User not registered for storage.");
  //       setIsMining(false);
  //       return;
  //     }

  //     // Start mining loop
  //     const interval = setInterval(() => {
  //       console.log("Submitting proof...");
  //       startMining();
  //     }, 5000);

  //     setMiningInterval(interval);
  //   }
  // };

  // Setup selector
  useEffect(() => {
    async function setupSelector() {
      try {
        console.log("Setting up wallet selector...");
        const newSelector = await setupWalletSelector({
          network: "testnet",
          modules: [
            setupMyNearWallet({
              walletUrl: "https://testnet.mynearwallet.com",
            }),
          ],
        });
        setSelector(newSelector);
      } catch (error) {
        console.log("Selector setup failed:", error);
      }
    }
    setupSelector();
  }, []);

  // Get account
  useEffect(() => {
    async function getWallet() {
      if (selector) {
        const wallet = await selector.wallet("my-near-wallet");
        const accounts = await wallet.getAccounts();
        const account = accounts[0];
        if (account) setAccount(account);
      }
    }
    getWallet();
  }, [selector]);

  useEffect(() => {
    const provider = new providers.JsonRpcProvider({
      url: "https://rpc.testnet.near.org",
    });

    async function mine() {
      try {
        if (selector != undefined && account != undefined && isMining) {
          const wallet = await selector.wallet("my-near-wallet");

          // 0. Register if needed
          const registeredResult = await provider.query({
            request_type: "call_function",
            account_id: "stratum-miner-v2.testnet",
            method_name: "storage_balance_of",
            args_base64: btoa(
              JSON.stringify({ account_id: account.accountId }),
            ),
            finality: "optimistic",
          });

          const balance = JSON.parse(
            Buffer.from((registeredResult as any).result).toString(),
          );
          const registered = balance && balance.total !== "0";

          if (!registered) {
            const registerResult = await wallet.signAndSendTransaction({
              actions: [
                {
                  type: "FunctionCall",
                  params: {
                    methodName: "storage_deposit",
                    args: {},
                    gas: "30000000000000",
                    deposit: "2350000000000000000000",
                  },
                },
              ],
            });
            console.log("register result", registerResult);
          }

          // 1. Get counter
          const counter = await provider
            .query({
              request_type: "call_function",
              account_id: "stratum-miner-v2.testnet",
              method_name: "get_counter",
              args_base64: "",
              finality: "optimistic",
            })
            .then((res) =>
              JSON.parse(Buffer.from((res as any).result).toString()),
            );
          console.log("counter", counter);

          // 2. Calculate proof
          const counterBytes = toLEBytes(counter);
          const proof = Array.from(keccak256(counterBytes));

          // 3. Send result
          const mineResult = await wallet.signAndSendTransaction({
            actions: [
              {
                type: "FunctionCall",
                params: {
                  methodName: "submit_proof",
                  args: {
                    proof,
                  },
                  gas: "30000000000000",
                  deposit: "0",
                },
              },
            ],
          });
          console.log("mine result", mineResult);

          // 4. Store success hash in state
        }
      } catch (error) {
        console.log("error", error);
      }
    }

    setInterval(mine, 5000);
    // mine();
  }, [selector, account, isMining]);

  const toLEBytes = (num: number) => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(num, 0);
    return buf;
  };

  return (
    <>
      <h1>Near POW</h1>
      {counter !== null ? (
        <p>Counter: {counter}</p>
      ) : (
        <p>Fetching counter...</p>
      )}

      {account && <div>{account.accountId}</div>}
      {account == undefined && selector !== undefined ? (
        <button
          onClick={() => {
            const modal = setupModal(selector, {
              contractId: "stratum-miner-v2.testnet",
            });
            modal.show();
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <div></div>
      )}
      {account && (
        <button onClick={() => setIsMining(!isMining)}>
          {isMining ? "Stop Mining" : "Start Mining"}
        </button>
      )}
    </>
  );
}

export default App;
