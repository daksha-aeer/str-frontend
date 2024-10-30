import { useEffect, useState } from "react";
import {
  Account,
  setupWalletSelector,
  WalletSelector,
} from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";

import "./App.css";

function App() {
  const [selector, setSelector] = useState<WalletSelector>();
  const [account, setAccount] = useState<Account>();
  console.log("hello");
  useEffect(() => {
    async function setupSelector() {
      try {
        console.log("setting selector");
        const newSelector = await setupWalletSelector({
          network: "testnet",
          modules: [
            setupMyNearWallet({
              walletUrl: "https://testnet.mynearwallet.com",
            }),
          ],
        });
        console.log("got selector", newSelector);
        setSelector(newSelector);
      } catch (error) {
        console.log("selector failed", error);
      }
    }
    setupSelector();
  }, []);

  useEffect(() => {
    async function getWallet() {
      console.log("wallet");
      if (selector !== undefined) {
        const wallet = await selector.wallet("my-near-wallet");
        const accounts = await wallet.getAccounts();
        const account = accounts.at(0);

        if (account !== undefined) {
          setAccount(account);
        }
        console.log(accounts);
      }
    }
    getWallet();
  }, [selector]);

  return (
    <>
      <h1>Near POW</h1>
      {account && <div>{account.accountId}</div>}
      {selector !== undefined ? (
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
        <div>No selector</div>
      )}
    </>
  );
}

export default App;
