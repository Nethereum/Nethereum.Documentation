import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type SectionItem = {
  title: string;
  icon: string;
  description: string;
  link: string;
};

type TaskItem = {
  task: string;
  packages: string;
  link: string;
};

const sections: SectionItem[] = [
  {
    title: 'Core Foundation',
    icon: '🔷',
    description: 'Web3, ABI, contracts, accounts, RPC, JSON-RPC transport',
    link: '/docs/core-foundation/overview',
  },
  {
    title: 'Signing & Key Management',
    icon: '🔐',
    description: 'HD wallets, keystores, hardware wallets, cloud KMS, EIP-712',
    link: '/docs/signing-and-key-management/overview',
  },
  {
    title: 'Smart Contracts & Code Gen',
    icon: '📜',
    description: 'Deploy, call, code generation, ENS, SIWE',
    link: '/docs/smart-contracts/overview',
  },
  {
    title: 'DeFi & Protocols',
    icon: '💱',
    description: 'Uniswap, Permit2, x402 payments, Gnosis Safe, Optimism',
    link: '/docs/defi/overview',
  },
  {
    title: 'EVM Simulator',
    icon: '🔬',
    description: 'In-process EVM execution, tracing, state change preview',
    link: '/docs/evm-simulator/overview',
  },
  {
    title: 'Chain Infrastructure',
    icon: '⚙',
    description: 'Shared blockchain engine — storage, block production, EVM, RPC routing',
    link: '/docs/chain-infrastructure/overview',
  },
  {
    title: 'DevChain',
    icon: '⛓',
    description: 'Local dev chain — instant mining, EVM-compatible tooling, Aspire templates',
    link: '/docs/devchain/overview',
  },
  {
    title: 'AppChains',
    icon: '🌍',
    description: 'Production app chains — sequencer, P2P networking, L1 anchoring',
    link: '/docs/application-chain/overview',
  },
  {
    title: 'Account Abstraction',
    icon: '🔑',
    description: 'ERC-4337 UserOps, bundler, paymaster, ERC-7579 smart accounts',
    link: '/docs/account-abstraction/overview',
  },
  {
    title: 'Data, Indexing & Explorer',
    icon: '📊',
    description: 'Block/tx/log crawling, PostgreSQL/SQLite storage, token indexing, EVM debugger, Blazor explorer',
    link: '/docs/data-and-indexing/overview',
  },
  {
    title: 'MUD Framework',
    icon: '🌐',
    description: 'Build structured on-chain applications — typed tables, systems, code generation, Store event indexing, and PostgreSQL normalisation',
    link: '/docs/mud-framework/overview',
  },
  {
    title: 'Wallet Connectivity',
    icon: '🔌',
    description: 'IEthereumHostProvider — the universal wallet abstraction for Blazor, Unity, and Wallet SDK',
    link: '/docs/wallet-connectivity/overview',
  },
  {
    title: 'Wallet SDK',
    icon: '💼',
    description: 'Multi-platform wallet: MVVM ViewModels, Blazor/MAUI renderers, hardware wallets',
    link: '/docs/wallet-sdk/overview',
  },
  {
    title: 'Web (Blazor) dApp Integration',
    icon: '🌐',
    description: 'Browser wallets, EIP-6963, MetaMask, WalletConnect, SIWE authentication',
    link: '/docs/blazor-dapp-integration/overview',
  },
  {
    title: 'Unity',
    icon: '🎮',
    description: 'Unity game engine integration, WebGL wallets, EIP-6963',
    link: '/docs/unity/overview',
  },
  {
    title: 'Data Services',
    icon: '🔍',
    description: 'Token portfolio via multicall, Etherscan, Sourcify, CoinGecko, Chainlist APIs',
    link: '/docs/data-services/overview',
  },
  {
    title: 'Consensus Light Client',
    icon: '🔭',
    description: 'Verified state queries, beacon chain light client, storage proofs, SSZ serialization',
    link: '/docs/consensus-light-client/overview',
  },
  {
    title: 'Client Extensions',
    icon: '🔌',
    description: 'Geth, Besu, and Quorum-specific admin and debug APIs',
    link: '/docs/client-extensions/overview',
  },
];

type TaskGroup = {
  category: string;
  tasks: TaskItem[];
};

const taskGroups: TaskGroup[] = [
  {
    category: 'Basics',
    tasks: [
      {task: 'Send ETH and interact with contracts', packages: 'Nethereum.Web3', link: '/docs/getting-started/first-project'},
      {task: 'Work with ERC-20/721/1155 tokens', packages: 'Nethereum.Web3', link: '/docs/smart-contracts/erc20'},
      {task: 'Query blocks and transactions', packages: 'Nethereum.Web3', link: '/docs/core-foundation/nethereum-rpc'},
    ],
  },
  {
    category: 'Signing & Security',
    tasks: [
      {task: 'Create an HD wallet from a mnemonic', packages: 'Nethereum.HdWallet', link: '/docs/signing-and-key-management/nethereum-hdwallet'},
      {task: 'Sign EIP-712 typed data', packages: 'Nethereum.Signer.EIP712', link: '/docs/signing-and-key-management/nethereum-signer-eip712'},
      {task: 'Sign with Ledger or Trezor', packages: 'Signer.Ledger / Signer.Trezor', link: '/docs/signing-and-key-management/overview'},
    ],
  },
  {
    category: 'Smart Contracts',
    tasks: [
      {task: 'Deploy a smart contract', packages: 'Nethereum.Web3', link: '/docs/smart-contracts/deploy-a-contract'},
      {task: 'Generate C# services from Solidity ABI', packages: 'Nethereum.Generator.Console', link: '/docs/smart-contracts/code-generation'},
      {task: 'Resolve an ENS name', packages: 'Nethereum.Contracts', link: '/docs/core-foundation/nethereum-contracts'},
    ],
  },
  {
    category: 'Local Development',
    tasks: [
      {task: 'Run a local dev chain (no external node)', packages: 'Nethereum.DevChain.Server', link: '/docs/devchain/overview'},
      {task: 'Simulate EVM execution in-process', packages: 'Nethereum.EVM', link: '/docs/evm-simulator/overview'},
      {task: 'Spin up a dev environment with Aspire', packages: 'dotnet new nethereum-devchain', link: '/docs/devchain/overview'},
      {task: 'Deploy a production app chain', packages: 'Nethereum.AppChain', link: '/docs/application-chain/overview'},
    ],
  },
  {
    category: 'Data & Indexing',
    tasks: [
      {task: 'Index blockchain data to PostgreSQL', packages: 'BlockchainProcessing + Store', link: '/docs/data-and-indexing/guide-database-storage'},
      {task: 'Index ERC-20/721/1155 token transfers', packages: 'BlockchainStorage.Token.Postgres', link: '/docs/data-and-indexing/guide-token-indexing'},
      {task: 'Build a blockchain explorer', packages: 'Nethereum.Explorer', link: '/docs/data-and-indexing/guide-explorer'},
      {task: 'Scan token balances via multicall (no indexer)', packages: 'Nethereum.TokenServices', link: '/docs/data-services/guide-token-portfolio'},
    ],
  },
  {
    category: 'Verification',
    tasks: [
      {task: 'Verify state without trusting RPC', packages: 'ChainStateVerification + LightClient', link: '/docs/consensus-light-client/guide-verified-state'},
      {task: 'Track finalized beacon headers', packages: 'Consensus.LightClient', link: '/docs/consensus-light-client/guide-light-client'},
    ],
  },
  {
    category: 'DeFi & Wallet',
    tasks: [
      {task: 'Swap tokens on Uniswap (V2/V3/V4)', packages: 'Nethereum.Uniswap', link: '/docs/defi/nethereum-uniswap'},
      {task: 'Build a Blazor dApp with MetaMask', packages: 'Blazor + Metamask.Blazor', link: '/docs/blazor-dapp-integration/overview'},
      {task: 'Use smart accounts (ERC-4337)', packages: 'Nethereum.AccountAbstraction', link: '/docs/account-abstraction/overview'},
    ],
  },
];

function SectionCard({title, icon, description, link}: SectionItem) {
  return (
    <Link to={link} className={styles.sectionCard}>
      <div className={styles.sectionIcon}>{icon}</div>
      <div>
        <div className={styles.sectionTitle}>{title}</div>
        <div className={styles.sectionDesc}>{description}</div>
      </div>
    </Link>
  );
}

function TaskRow({task, packages, link}: TaskItem) {
  return (
    <Link to={link} className={styles.taskRow}>
      <span className={styles.taskText}>{task}</span>
      <code className={styles.taskPackage}>{packages}</code>
    </Link>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description="Nethereum is the Ethereum development platform for the .NET ecosystem — providing libraries and developer infrastructure for smart contracts, wallets, indexing, developer tooling, and blockchain applications.">

      {/* Hero */}
      <header className={styles.hero}>
        <div className="container">
          <img src="/img/nethereum-logo.png" alt="Nethereum" className={styles.heroLogo} />
          <Heading as="h1" className={styles.heroTitle}>
            Nethereum Documentation
          </Heading>
          <p className={styles.heroSubtitle}>
            The Ethereum development platform for the .NET ecosystem — providing libraries and developer infrastructure for smart contracts, wallets, indexing, developer tooling, and blockchain applications
          </p>
          <div className={styles.heroButtons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/welcome">
              Get Started
            </Link>
            <Link className="button button--outline button--lg" to="/docs/component-catalog">
              All Packages
            </Link>
            <Link className="button button--outline button--lg" href="http://playground.nethereum.com">
              Playground
            </Link>
          </div>
        </div>
      </header>

      <main className="container">

        {/* ─── Sections Grid ─── */}
        <section className={styles.sectionsArea}>
          <Heading as="h2" className={styles.areaTitle}>Documentation Sections</Heading>
          <div className={styles.sectionsGrid}>
            {sections.map((s, i) => (
              <SectionCard key={i} {...s} />
            ))}
          </div>
        </section>

        {/* ─── What Do You Want to Do? ─── */}
        <section className={styles.tasksArea}>
          <Heading as="h2" className={styles.areaTitle}>What Do You Want to Do?</Heading>
          <p className={styles.areaSubtitle}>
            Click any task to find the guide and packages you need.{' '}
            <Link to="/docs/what-do-you-want-to-do">See all 44 use cases →</Link>
          </p>
          <div className={styles.taskGroups}>
            {taskGroups.map((group, gi) => (
              <div key={gi} className={styles.taskGroup}>
                <div className={styles.taskGroupTitle}>{group.category}</div>
                {group.tasks.map((t, ti) => (
                  <TaskRow key={ti} {...t} />
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Additional Resources ─── */}
        <section className={styles.resourcesArea}>
          <div className={styles.resourcesGrid}>
            <Link to="/docs/architecture" className={styles.resourceCard}>
              <div className={styles.resourceIcon}>🗺</div>
              <div className={styles.resourceTitle}>Architecture Map</div>
              <div className={styles.resourceDesc}>Understand how all 130+ packages fit together</div>
            </Link>
            <Link to="/docs/component-catalog" className={styles.resourceCard}>
              <div className={styles.resourceIcon}>📦</div>
              <div className={styles.resourceTitle}>Component Catalog</div>
              <div className={styles.resourceDesc}>Searchable index of every NuGet package</div>
            </Link>
            <Link href="http://playground.nethereum.com" className={styles.resourceCard}>
              <div className={styles.resourceIcon}>🎮</div>
              <div className={styles.resourceTitle}>Playground</div>
              <div className={styles.resourceDesc}>Run Nethereum code interactively in your browser</div>
            </Link>
            <Link href="https://github.com/Nethereum/Nethereum" className={styles.resourceCard}>
              <div className={styles.resourceIcon}>🐙</div>
              <div className={styles.resourceTitle}>GitHub</div>
              <div className={styles.resourceDesc}>Source code, issues, and contributions</div>
            </Link>
          </div>
        </section>

      </main>
    </Layout>
  );
}
