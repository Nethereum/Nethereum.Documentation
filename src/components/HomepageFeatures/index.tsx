import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Smart Contracts',
    icon: '📜',
    description: (
      <>
        Deploy, call, and listen to events for any smart contract. Code generation creates typed C# services from Solidity ABI.
      </>
    ),
    link: '/docs/smart-contracts/overview',
  },
  {
    title: 'In-Process Dev Chain',
    icon: '⛓',
    description: (
      <>
        Run a full Ethereum node in-process with no external dependencies. EVM execution, tracing, and debugging built in.
      </>
    ),
    link: '/docs/devchain/overview',
  },
  {
    title: 'Account Abstraction',
    icon: '🔑',
    description: (
      <>
        ERC-4337 UserOperations, bundler, paymaster, and ERC-7579 modular smart accounts with session keys.
      </>
    ),
    link: '/docs/account-abstraction/overview',
  },
  {
    title: 'Data Indexing',
    icon: '📊',
    description: (
      <>
        Crawl and store blocks, transactions, logs, and token transfers. PostgreSQL storage with reorg handling.
      </>
    ),
    link: '/docs/data-and-indexing/overview',
  },
  {
    title: 'Multi-Platform',
    icon: '🖥',
    description: (
      <>
        Runs on .NET 8/10, Blazor, MAUI, Unity, and WebAssembly. Windows, Linux, macOS, Android, iOS, and game consoles.
      </>
    ),
    link: '/docs/getting-started/installation',
  },
  {
    title: '130+ Packages',
    icon: '📦',
    description: (
      <>
        DeFi protocols, token services, MUD autonomous worlds, wallet UI, Aspire orchestration, and more.
      </>
    ),
    link: '/docs/what-do-you-want-to-do',
  },
];

function Feature({title, icon, description, link}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <Link to={link} className={styles.featureLink}>
        <div className="text--center padding-horiz--md">
          <div className={styles.featureIcon}>{icon}</div>
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
