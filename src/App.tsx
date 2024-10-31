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

function App() {
  const [selector, setSelector] = useState<WalletSelector>();
  const [account, setAccount] = useState<Account>();
  const [salt, setSalt] = useState(null);
  const [counter, setCounter] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [miningInterval, setMiningInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  const toggleMining = async () => {
    if (isMining) {
      // Stop mining
      console.log("Stopping mining...");
      clearInterval(miningInterval!);
      setMiningInterval(null);
      setIsMining(false);
    } else {
      console.log("Starting mining...");
      setIsMining(true);

      // Ensure storage deposit before starting mining
      const registered = await checkStorageDeposit();
      if (!registered) {
        console.log("User not registered for storage.");
        setIsMining(false);
        return;
      }

      // Start mining loop
      const interval = setInterval(() => {
        console.log("Submitting proof...");
        startMining();
      }, 5000);

      setMiningInterval(interval);
    }
  };

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

  useEffect(() => {
    async function getWallet() {
      if (selector) {
        const wallet = await selector.wallet("my-near-wallet");
        const accounts = await wallet.getAccounts();
        const account = accounts[0];
        if (account) setAccount(account);
        console.log("Account loaded:", accounts);
      }
    }
    getWallet();
  }, [selector]);

  const checkStorageDeposit = async () => {
    if (!selector || !account) return false;

    const provider = new providers.JsonRpcProvider({
      url: "https://rpc.testnet.near.org",
    });

    try {
      const result = await provider.query({
        request_type: "call_function",
        account_id: "stratum-miner-v2.testnet",
        method_name: "storage_balance_of",
        args_base64: btoa(JSON.stringify({ account_id: account.accountId })),
        finality: "optimistic",
      });

      const balance = JSON.parse(Buffer.from(result.result).toString());
      const registered = balance && balance.total !== "0";

      setIsRegistered(registered);
      return registered;
    } catch (error) {
      console.error("Storage deposit check failed:", error);
      return false;
    }
  };

  const toLEBytes = (num) => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(num, 0);
    return buf;
  };

  const startMining = async () => {
    if (!selector || !account) {
      console.log("Wallet or account not available.");
      return;
    }

    try {
      const provider = new providers.JsonRpcProvider({
        url: "https://rpc.testnet.near.org",
      });

      const salt = await provider
        .query({
          request_type: "call_function",
          account_id: "stratum-miner-v2.testnet",
          method_name: "get_salt",
          args_base64: "",
          finality: "optimistic",
        })
        .then((res) => JSON.parse(Buffer.from(res.result).toString()));
      const counter = await provider
        .query({
          request_type: "call_function",
          account_id: "stratum-miner-v2.testnet",
          method_name: "get_counter",
          args_base64: "",
          finality: "optimistic",
        })
        .then((res) => JSON.parse(Buffer.from(res.result).toString()));

      setSalt(salt);
      setCounter(counter);

      const counterBytes = toLEBytes(counter);
      const proof = Array.from(keccak256(counterBytes));

      const wallet = await selector.wallet("my-near-wallet");
      await wallet.signAndSendTransaction({
        receiverId: "stratum-miner-v2.testnet",
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "submit_proof",
              args: { proof },
              gas: "100000000000000",
              deposit: "0",
            },
          },
        ],
      });

      console.log("Proof submitted successfully!");
    } catch (error) {
      console.error("Error during mining:", error);
    }
  };

  return (
    <>
      <h1>Near POW</h1>
      {salt !== null ? <p>Salt: {salt}</p> : <p>Fetching salt...</p>}
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
              contractId: "test.testnet",
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
        <button onClick={toggleMining}>
          {isMining ? "Stop Mining" : "Start Mining"}
        </button>
      )}
    </>
  );
}

export default App;
