import { useEffect, useRef, useState } from "react";
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
import MiningResultsList from "./MiningResultsList";

const sound = new Audio("metal-clang.mp3");

export interface MiningResult {
  count: string;
  proof: string;
  hash: string;
}

const CONTRACT_ADDRESS = "stratum-miner-v2.testnet";

const provider = new providers.JsonRpcProvider({
  url: "https://rpc.testnet.near.org",
});

function App() {
  const [selector, setSelector] = useState<WalletSelector>();
  const [account, setAccount] = useState<Account>();
  const [isMining, setIsMining] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [miningResults, setResults] = useState<MiningResult[]>([]);
  const [balance, setBalance] = useState<string>();

  async function fetchBalance() {
    const balanceResult = await provider.query({
      request_type: "call_function",
      account_id: CONTRACT_ADDRESS,
      method_name: "ft_balance_of",
      args_base64: btoa(JSON.stringify({ account_id: account.accountId })),
      finality: "optimistic",
    });

    const balance = JSON.parse(
      Buffer.from((balanceResult as any).result).toString(),
    ).toString() as string;
    setBalance(balance);
  }

  // Setup selector
  useEffect(() => {
    async function setupSelector() {
      try {
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
        if (account !== undefined) {
          setAccount(account);
        }
      }
    }
    getWallet();
  }, [selector]);

  // Get initial balance
  useEffect(() => {
    if (account !== undefined) {
      fetchBalance();
    }
  }, [account]);

  useEffect(() => {
    const provider = new providers.JsonRpcProvider({
      url: "https://rpc.testnet.near.org",
    });

    async function mine() {
      if (selector != undefined && account != undefined) {
        const wallet = await selector.wallet("my-near-wallet");

        // 0. Register if needed
        const registeredResult = await provider.query({
          request_type: "call_function",
          account_id: CONTRACT_ADDRESS,
          method_name: "storage_balance_of",
          args_base64: btoa(JSON.stringify({ account_id: account.accountId })),
          finality: "optimistic",
        });

        const balance = JSON.parse(
          Buffer.from((registeredResult as any).result).toString(),
        );
        const registered = balance && balance.total !== "0";

        if (!registered) {
          await wallet.signAndSendTransaction({
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
        }

        // 1. Get counter
        const counter = await provider
          .query({
            request_type: "call_function",
            account_id: CONTRACT_ADDRESS,
            method_name: "get_counter",
            args_base64: "",
            finality: "optimistic",
          })
          .then((res) =>
            JSON.parse(Buffer.from((res as any).result).toString()),
          );

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

        await fetchBalance();

        sound.play();

        // 4. Store success hash in state
        let result: MiningResult = {
          count: counter,
          proof: toHexString(proof),
          hash: mineResult.transaction.hash,
        };
        const newResults = [result, ...miningResults];
        setResults(newResults);
      }
    }

    if (isMining) {
      intervalRef.current = setInterval(mine, 5000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selector, account, isMining, miningResults]);

  const toLEBytes = (num: number) => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(num, 0);
    return buf;
  };

  function toHexString(proof: number[]): string {
    return proof.map((num) => num.toString(16).padStart(2, "0")).join("");
  }

  return (
    <>
      <div className="main">
        <h1
          style={{
            fontFamily: "Minecraft",
          }}
          className="white-text"
        >
          Stratum: PoW token on NEAR
        </h1>

        <p className="white-text">
          Stratum is a cryptocurrency anyone can mine on their computer or
          phone. Enabled by NEAR's powerful WASM runtime and Rust, we embedded a
          proof of work algorithm within a smart contract. Anybody can call this
          function with a valid Keccak proof to mine tokens. Stratum combines
          the best of Bitcoin and NEAR's next generation blockchain-
          decentralized and censorship resistant money combined with the power
          of smart contracts.
          <br />
          <br />
          To run the demo simply press the mine button, create a testnet account
          if needed and approve the required permissions. The app will start
          mining tokens and display a list of successful transactions.
        </p>
        {account == undefined && selector !== undefined ? (
          <button
            onClick={() => {
              const modal = setupModal(selector, {
                contractId: CONTRACT_ADDRESS,
              });
              modal.show();
            }}
          >
            Connect Wallet
          </button>
        ) : (
          <div></div>
        )}

        {account !== undefined ? (
          <>
            <h2 className="white-text">
              {account.accountId} balance: {balance ?? "0"} $STR
            </h2>
            <br />
            <button
              onClick={() => {
                sound.play();
                setIsMining(!isMining);
              }}
            >
              {isMining ? "Stop Mining" : "Start Mining"}
            </button>
          </>
        ) : (
          <></>
        )}
        <br />
        <br />
        <MiningResultsList results={miningResults} />
      </div>
    </>
  );
}

export default App;
