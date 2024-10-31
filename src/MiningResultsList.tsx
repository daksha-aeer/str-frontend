import React from "react";
import { MiningResult } from "./App";

interface MiningResultsListProps {
  results: MiningResult[];
}

const MiningResultsList: React.FC<MiningResultsListProps> = ({ results }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {results.map((result) => (
        <div
          key={result.hash}
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #ccc",
            padding: "0.5rem",
            borderRadius: "6px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            fontSize: "0.9rem",
            gap: "1rem",
          }}
        >
          {/* <span style={{ fontWeight: "bold" }}>#{result.count}</span> */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}
          >
            <span>
              <strong>#{result.count} Proof:</strong> {result.proof}
            </span>
            <span>
              +1 $STR, Explorer:{" "}
              <a
                href={`https://testnet.nearblocks.io/txns/${result.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#007bff", textDecoration: "none" }}
              >
                {result.hash.slice(0, 4)}...{result.hash.slice(-3)}
              </a>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MiningResultsList;
