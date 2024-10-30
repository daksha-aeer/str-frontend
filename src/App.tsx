import { useEffect, useState } from "react";
import {
  setupWalletSelector,
  WalletSelector,
} from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";

import "./App.css";

function App() {
  const [selector, setSelector] = useState<WalletSelector>();

  useEffect(() => {
    async function setupSelector() {
      try {
        console.log("setting selector");
        const newSelector = await setupWalletSelector({
          network: "testnet",
          modules: [setupMyNearWallet()],
        });
        console.log("got selector", newSelector);
        setSelector(newSelector);
      } catch (error) {
        console.log("selector failed", error);
      }
    }
    setupSelector();
  }, []);

  return (
    <>
      <h1>Near POW</h1>
      {/* {selector !== undefined ? (
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
      )} */}
    </>
  );
}

export default App;
