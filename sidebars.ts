import type {SidebarsConfig} from '@docusaurus/types';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    // ─── Getting Started ───
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/welcome',
        'getting-started/installation',
        'getting-started/first-project',
        'getting-started/choosing-a-connection',
      ],
    },

    // ─── What Do You Want to Do? ───
    {
      type: 'doc',
      id: 'what-do-you-want-to-do',
      label: 'What Do You Want to Do?',
    },

    // ─── Reference ───
    {
      type: 'category',
      label: 'Reference',
      items: [
        'component-catalog',
        'architecture',
      ],
    },

    // ═══════════════════════════════
    // Core Foundation
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Core Foundation',
      items: [
        'core-foundation/overview',
        {
          type: 'category',
          label: 'Essentials',
          collapsed: false,
          items: [
            'core-foundation/guide-query-balance',
            'core-foundation/guide-unit-conversion',
            'core-foundation/guide-fee-estimation',
            'core-foundation/guide-send-eth',
            'core-foundation/guide-send-transaction',
            'core-foundation/guide-query-blocks',
          ],
        },
        {
          type: 'category',
          label: 'Transaction Deep Dives',
          items: [
            'core-foundation/guide-transaction-models',
            'core-foundation/guide-eip7702',
            'core-foundation/guide-transaction-hash',
            'core-foundation/guide-transaction-recovery',
            'core-foundation/guide-transaction-replacement',
            'core-foundation/guide-pending-transactions',
            'core-foundation/guide-decode-transactions',
          ],
        },
        {
          type: 'category',
          label: 'Encoding & Utilities',
          items: [
            'core-foundation/guide-abi-encoding',
            'core-foundation/guide-hex-encoding',
            'core-foundation/guide-address-utils',
            'core-foundation/guide-rlp-encoding',
          ],
        },
        {
          type: 'category',
          label: 'Transport & Streaming',
          items: [
            'core-foundation/guide-rpc-transport',
            'core-foundation/guide-realtime-streaming',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'core-foundation/nethereum-web3',
            'core-foundation/nethereum-abi',
            'core-foundation/nethereum-contracts',
            'core-foundation/nethereum-accounts',
            'core-foundation/nethereum-model',
            'core-foundation/nethereum-hex',
            'core-foundation/nethereum-rlp',
            'core-foundation/nethereum-util',
            'core-foundation/nethereum-util-rest',
            'core-foundation/nethereum-biginteger-n351',
            'core-foundation/nethereum-rpc',
            'core-foundation/nethereum-rpc-extensions',
            'core-foundation/nethereum-rpc-reactive',
            'consensus-and-cryptography/nethereum-merkle',
            {
              type: 'category',
              label: 'JSON-RPC Transport',
              items: [
                'json-rpc-transport/overview',
                'json-rpc-transport/nethereum-jsonrpc-client',
                'json-rpc-transport/nethereum-jsonrpc-rpcclient',
                'json-rpc-transport/nethereum-jsonrpc-systemtextjsonrpcclient',
                'json-rpc-transport/nethereum-jsonrpc-ipcclient',
                'json-rpc-transport/nethereum-jsonrpc-websocketclient',
                'json-rpc-transport/nethereum-jsonrpc-websocketstreamingclient',
              ],
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Signing & Key Management
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Signing & Key Management',
      items: [
        'signing-and-key-management/overview',
        {
          type: 'category',
          label: 'Keys & Signing',
          collapsed: false,
          items: [
            'signing-and-key-management/guide-keys-accounts',
            'signing-and-key-management/guide-message-signing',
            'signing-and-key-management/guide-eip712-signing',
          ],
        },
        {
          type: 'category',
          label: 'Key Storage & Derivation',
          items: [
            'signing-and-key-management/guide-keystore',
            'signing-and-key-management/guide-hd-wallets',
          ],
        },
        {
          type: 'category',
          label: 'External Signers',
          items: [
            'signing-and-key-management/guide-hardware-wallets',
            'signing-and-key-management/guide-cloud-kms',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'signing-and-key-management/nethereum-signer',
            'signing-and-key-management/nethereum-signer-eip712',
            'signing-and-key-management/nethereum-keystore',
            'signing-and-key-management/nethereum-hdwallet',
            'signing-and-key-management/nethereum-signer-ledger',
            'signing-and-key-management/nethereum-signer-trezor',
            'signing-and-key-management/nethereum-signer-awskeymanagement',
            'signing-and-key-management/nethereum-signer-azurekeyvault',
            'signing-and-key-management/nethereum-signer-bls',
            'signing-and-key-management/nethereum-signer-bls-herumi',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Smart Contracts
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'smart-contracts/overview',
        {
          type: 'category',
          label: 'Getting Started',
          collapsed: false,
          items: [
            'smart-contracts/guide-smart-contract-interaction',
            'smart-contracts/deploy-a-contract',
            'smart-contracts/erc20',
            'smart-contracts/code-generation',
          ],
        },
        {
          type: 'category',
          label: 'Advanced Patterns',
          items: [
            'smart-contracts/guide-events',
            'smart-contracts/guide-multicall',
            'smart-contracts/guide-error-handling',
            'smart-contracts/guide-built-in-standards',
            'smart-contracts/guide-create2-deployment',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // DeFi & Protocols
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'DeFi & Protocols',
      items: [
        'defi/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'defi/nethereum-uniswap',
            'defi/nethereum-x402',
            'protocols/nethereum-gnosissafe',
            'protocols/nethereum-circles',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // EVM Simulator
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'EVM Simulator',
      items: [
        'evm-simulator/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'evm-simulator/nethereum-evm',
            'evm-simulator/nethereum-evm-contracts',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Chain Infrastructure
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Chain Infrastructure',
      items: [
        'chain-infrastructure/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'chain-infrastructure/nethereum-corechain',
            'chain-infrastructure/nethereum-corechain-rocksdb',
            'consensus-and-cryptography/nethereum-merkle-patricia',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // DevChain
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'DevChain',
      items: [
        'devchain/overview',
        {
          type: 'category',
          label: 'Guides',
          items: [
            'devchain/devchain-quickstart',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'devchain/nethereum-devchain',
            'devchain/nethereum-devchain-server',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // AppChains
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'AppChains (Preview)',
      items: [
        'application-chain/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'application-chain/nethereum-appchain',
            'application-chain/nethereum-appchain-server',
            'application-chain/nethereum-appchain-sequencer',
            {
              type: 'category',
              label: 'Networking',
              items: [
                'application-chain/nethereum-appchain-sync',
                'application-chain/nethereum-appchain-p2p',
                'application-chain/nethereum-appchain-p2p-dotnetty',
                'application-chain/nethereum-appchain-p2p-server',
              ],
            },
            {
              type: 'category',
              label: 'Governance & Anchoring',
              items: [
                'application-chain/nethereum-appchain-policy',
                'application-chain/nethereum-appchain-anchoring',
                'application-chain/nethereum-consensus-clique',
              ],
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Account Abstraction (ERC-4337 / ERC-7579)
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Account Abstraction',
      items: [
        'account-abstraction/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'account-abstraction/nethereum-accountabstraction',
            'account-abstraction/nethereum-accountabstraction-bundler',
            'account-abstraction/nethereum-accountabstraction-bundler-rpcserver',
            'account-abstraction/nethereum-accountabstraction-simpleaccount',
            'account-abstraction/nethereum-accountabstraction-appchain',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Data, Indexing & Explorer
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Data, Indexing & Explorer',
      items: [
        'data-and-indexing/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            {
              type: 'category',
              label: 'Processing',
              items: [
                'data-and-indexing/nethereum-blockchainprocessing',
                'data-and-indexing/nethereum-blockchainstorage-processors',
                'data-and-indexing/nethereum-blockchainstorage-processors-postgres',
                'data-and-indexing/nethereum-blockchainstorage-processors-sqlserver',
                'data-and-indexing/nethereum-blockchainstorage-processors-sqlite',
              ],
            },
            {
              type: 'category',
              label: 'Storage (Entity Framework Core)',
              items: [
                'data-and-indexing/nethereum-blockchainstore-efcore',
                'data-and-indexing/nethereum-blockchainstore-postgres',
                'data-and-indexing/nethereum-blockchainstore-sqlserver',
                'data-and-indexing/nethereum-blockchainstore-sqlite',
              ],
            },
            {
              type: 'category',
              label: 'Token Indexing',
              items: [
                'data-and-indexing/nethereum-blockchainstorage-token-postgres',
              ],
            },
            'data-and-indexing/nethereum-explorer',
            'data-and-indexing/nethereum-tokenservices',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // MUD Framework (Autonomous Worlds)
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'MUD Framework',
      items: [
        'mud-framework/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'mud-framework/nethereum-mud',
            'mud-framework/nethereum-mud-contracts',
            'mud-framework/nethereum-mudblazorcomponents',
            'mud-framework/nethereum-mud-repositories-entityframework',
            'mud-framework/nethereum-mud-repositories-postgres',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Wallet & UI
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Wallet & UI',
      items: [
        'wallet-and-ui/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            {
              type: 'category',
              label: 'Wallet Core',
              items: [
                'core-foundation/nethereum-ui',
                'wallet-and-ui/nethereum-wallet',
                'wallet-and-ui/nethereum-wallet-rpcrequests',
                'wallet-and-ui/nethereum-wallet-ui-components',
                'wallet-and-ui/nethereum-wallet-ui-components-trezor',
              ],
            },
            {
              type: 'category',
              label: 'Blazor',
              items: [
                'wallet-and-ui/nethereum-wallet-ui-components-blazor',
                'wallet-and-ui/nethereum-wallet-ui-components-blazor-trezor',
                'web-and-browser-integration/nethereum-blazor',
                'web-and-browser-integration/nethereum-blazor-solidity',
                'web-and-browser-integration/nethereum-eip6963walletinterop',
                'web-and-browser-integration/nethereum-metamask',
                'web-and-browser-integration/nethereum-metamask-blazor',
                'web-and-browser-integration/nethereum-walletconnect',
                'web-and-browser-integration/nethereum-reown-appkit-blazor',
              ],
            },
            {
              type: 'category',
              label: 'MAUI',
              items: [
                'wallet-and-ui/nethereum-wallet-ui-components-maui',
              ],
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Unity
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Unity',
      items: [
        'web-and-browser-integration/nethereum-unity-eip6963',
      ],
    },

    // ═══════════════════════════════
    // Data Services
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Data Services',
      items: [
        'data-services/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'data-services/nethereum-dataservices',
          ],
        },
      ],
    },

    // ─── Consensus Light Client ───
    {
      type: 'category',
      label: 'Consensus Light Client',
      items: [
        'consensus-light-client/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'consensus-light-client/nethereum-beaconchain',
            'consensus-and-cryptography/nethereum-ssz',
            'consensus-and-cryptography/nethereum-consensus-ssz',
            'consensus-and-cryptography/nethereum-consensus-lightclient',
            'data-and-indexing/nethereum-chainstateverification',
          ],
        },
      ],
    },

    // ─── Client Extensions ───
    {
      type: 'category',
      label: 'Client Extensions',
      items: [
        'client-extensions/overview',
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'client-extensions/nethereum-geth',
            'client-extensions/nethereum-besu',
            'client-extensions/nethereum-quorum',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
