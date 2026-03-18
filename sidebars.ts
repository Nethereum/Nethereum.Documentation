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
          label: 'Guides',
          collapsed: false,
          items: [
            'smart-contracts/guide-smart-contract-interaction',
            'smart-contracts/deploy-a-contract',
            'smart-contracts/erc20',
            'smart-contracts/code-generation',
            'smart-contracts/guide-events',
            'smart-contracts/guide-error-handling',
            'smart-contracts/guide-built-in-standards',
          ],
        },
        {
          type: 'category',
          label: 'Advanced Patterns',
          items: [
            'smart-contracts/guide-multicall',
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
          label: 'Guides',
          collapsed: false,
          items: [
            'defi/guide-uniswap-swap',
            'defi/guide-uniswap-liquidity',
            'defi/guide-gnosis-safe',
            'defi/guide-x402-payments',
            'defi/guide-circles',
            'protocols/guide-siwe',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'defi/nethereum-uniswap',
            'defi/nethereum-x402',
            'protocols/nethereum-gnosissafe',
            'protocols/nethereum-circles',
            'protocols/nethereum-siwe-core',
            'protocols/nethereum-siwe',
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
          label: 'Simulation & Decoding',
          collapsed: false,
          items: [
            'evm-simulator/guide-transaction-simulation',
            'evm-simulator/guide-call-tree-decoding',
            'evm-simulator/guide-log-extraction',
            'evm-simulator/guide-revert-decoding',
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          items: [
            'evm-simulator/guide-erc20-simulation',
            'evm-simulator/guide-bytecode-execution',
            'evm-simulator/guide-evm-debugging',
            'evm-simulator/guide-bytecode-disassembly',
          ],
        },
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
          label: 'Guides',
          collapsed: false,
          items: [
            'chain-infrastructure/guide-custom-chain-node',
            'chain-infrastructure/guide-custom-storage',
            'chain-infrastructure/guide-custom-rpc-handlers',
            'chain-infrastructure/guide-forking',
          ],
        },
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
          collapsed: false,
          items: [
            'devchain/devchain-quickstart',
            'devchain/guide-http-server',
            'devchain/guide-testing-patterns',
            'devchain/guide-forking-and-state',
            'devchain/guide-debug-trace',
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
    // Aspire Templates
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Aspire Templates',
      items: [
        'aspire-templates/overview',
        {
          type: 'category',
          label: 'Getting Started',
          collapsed: false,
          items: [
            'aspire-templates/guide-devchain-template',
            'aspire-templates/guide-dapp-template',
          ],
        },
        {
          type: 'category',
          label: 'Solidity Development',
          items: [
            'aspire-templates/guide-solidity-setup',
            'aspire-templates/guide-solidity-contracts',
            'aspire-templates/guide-forge-testing',
            'aspire-templates/guide-forge-deploy',
          ],
        },
        {
          type: 'category',
          label: 'C# Integration',
          items: [
            'aspire-templates/guide-codegen',
            'aspire-templates/guide-csharp-unit-testing',
            'aspire-templates/guide-integration-testing',
          ],
        },
        {
          type: 'category',
          label: 'dApp Development',
          items: [
            'aspire-templates/guide-wallet-integration',
            'aspire-templates/guide-webapp-token-interaction',
            'aspire-templates/guide-explorer-abi-discovery',
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
          label: 'Guides',
          collapsed: false,
          items: [
            'account-abstraction/guide-send-useroperation',
            'account-abstraction/guide-smart-contracts-with-aa',
            'account-abstraction/guide-smart-account-deployment',
            'account-abstraction/guide-batching-and-paymasters',
            'account-abstraction/guide-modular-accounts',
            'account-abstraction/guide-run-bundler',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'account-abstraction/nethereum-accountabstraction',
            'account-abstraction/nethereum-accountabstraction-bundler',
            'account-abstraction/nethereum-accountabstraction-bundler-rpcserver',
            'account-abstraction/nethereum-accountabstraction-simpleaccount',
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
          label: 'Guides',
          collapsed: false,
          items: [
            'data-and-indexing/guide-blockchain-processing',
            'data-and-indexing/guide-database-storage',
            'data-and-indexing/guide-token-indexing',
            'data-and-indexing/guide-explorer',
          ],
        },
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
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // MUD Framework
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'MUD Framework',
      items: [
        'mud-framework/overview',
        {
          type: 'category',
          label: 'Guides',
          collapsed: false,
          items: [
            'mud-framework/guide-mud-quickstart',
            'mud-framework/guide-mud-tables',
            'mud-framework/guide-mud-indexing',
            'mud-framework/guide-mud-deployment',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'mud-framework/nethereum-mud',
            'mud-framework/nethereum-mud-contracts',
            'mud-framework/nethereum-mud-repositories-entityframework',
            'mud-framework/nethereum-mud-repositories-postgres',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Wallet Connectivity
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Wallet Connectivity',
      items: [
        'wallet-connectivity/overview',
        {
          type: 'category',
          label: 'Guides',
          collapsed: false,
          items: [
            'wallet-connectivity/guide-host-providers',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'wallet-connectivity/nethereum-ui',
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Wallet SDK
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Wallet SDK',
      items: [
        'wallet-sdk/overview',
        {
          type: 'category',
          label: 'Guides',
          collapsed: false,
          items: [
            'wallet-sdk/guide-wallet-quickstart',
            'wallet-sdk/guide-wallet-architecture',
            'wallet-sdk/guide-wallet-accounts',
            'wallet-sdk/guide-wallet-transactions',
            'wallet-sdk/guide-wallet-rpc-provider',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            {
              type: 'category',
              label: 'Wallet Core',
              items: [
                'wallet-sdk/nethereum-wallet',
                'wallet-sdk/nethereum-wallet-rpcrequests',
                'wallet-sdk/nethereum-wallet-ui-components',
                'wallet-sdk/nethereum-wallet-ui-components-trezor',
              ],
            },
            {
              type: 'category',
              label: 'Renderers',
              items: [
                'wallet-sdk/nethereum-wallet-ui-components-blazor',
                'wallet-sdk/nethereum-wallet-ui-components-blazor-trezor',
                'wallet-sdk/nethereum-wallet-ui-components-maui',
              ],
            },
            {
              type: 'category',
              label: 'Hardware & Mobile',
              items: [
                'wallet-sdk/nethereum-maui-androidusb',
              ],
            },
          ],
        },
      ],
    },

    // ═══════════════════════════════
    // Web (Blazor) dApp Integration
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'Web (Blazor) dApp Integration',
      items: [
        'blazor-dapp-integration/overview',
        {
          type: 'category',
          label: 'Guides',
          collapsed: false,
          items: [
            'blazor-dapp-integration/guide-blazor-wallet-connect',
            'blazor-dapp-integration/guide-blazor-authentication',
            'blazor-dapp-integration/guide-blazor-contract-interaction',
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          items: [
            'blazor-dapp-integration/guide-blazor-solidity-debugger',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            {
              type: 'category',
              label: 'Wallet Providers',
              items: [
                'blazor-dapp-integration/nethereum-blazor',
                'blazor-dapp-integration/nethereum-eip6963walletinterop',
                'blazor-dapp-integration/nethereum-metamask',
                'blazor-dapp-integration/nethereum-metamask-blazor',
                'blazor-dapp-integration/nethereum-walletconnect',
                'blazor-dapp-integration/nethereum-reown-appkit-blazor',
              ],
            },
            {
              type: 'category',
              label: 'Tools',
              items: [
                'blazor-dapp-integration/nethereum-blazor-solidity',
                'blazor-dapp-integration/nethereum-mudblazorcomponents',
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
        'unity/overview',
        {
          type: 'category',
          label: 'Getting Started',
          collapsed: false,
          items: [
            'unity/guide-unity-quickstart',
            'unity/guide-unity-wallets',
          ],
        },
        {
          type: 'category',
          label: 'Smart Contracts & Code Sharing',
          items: [
            'unity/guide-unity-smart-contracts',
            'unity/guide-unity-code-generation',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'unity/nethereum-unity',
            'unity/nethereum-unity-eip6963',
            'unity/nethereum-unity-metamask',
          ],
        },
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
          label: 'Guides',
          collapsed: false,
          items: [
            'data-services/guide-abi-retrieval',
            'data-services/guide-token-portfolio',
            'data-services/guide-chainlist-rpc',
            'data-services/guide-etherscan-api',
            'data-services/guide-sourcify-api',
            'data-services/guide-coingecko-api',
          ],
        },
        {
          type: 'category',
          label: 'Package Reference',
          items: [
            'data-services/nethereum-dataservices',
            'data-services/nethereum-sourcify-database',
            'data-services/nethereum-tokenservices',
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
          label: 'Guides',
          collapsed: false,
          items: [
            'consensus-light-client/guide-verified-state',
            'consensus-light-client/guide-light-client',
          ],
        },
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

    // ═══════════════════════════════
    // AppChains (Preview)
    // ═══════════════════════════════
    {
      type: 'category',
      label: 'AppChains (Preview)',
      items: [
        'application-chain/overview',
        {
          type: 'category',
          label: 'Getting Started',
          collapsed: false,
          items: [
            'application-chain/guide-appchain-quickstart',
            'application-chain/guide-appchain-storage',
            'application-chain/guide-appchain-sync',
          ],
        },
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
  ],
};

export default sidebars;
