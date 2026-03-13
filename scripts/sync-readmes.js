#!/usr/bin/env node

/**
 * Syncs README.md files from the Nethereum source repository into the
 * Docusaurus docs/ directory, organized by unified section folders.
 *
 * The PACKAGE_CATEGORY map is the single source of truth, derived from
 * COMPONENTS.md sections.
 *
 * Usage:
 *   node scripts/sync-readmes.js <nethereum-repo-path>
 *
 * Example:
 *   node scripts/sync-readmes.js ../Nethereum
 *   node scripts/sync-readmes.js C:/Users/dev/Nethereum
 */

const fs = require('fs');
const path = require('path');

const nethereumRoot = process.argv[2];
if (!nethereumRoot) {
  console.error('Usage: node scripts/sync-readmes.js <nethereum-repo-path>');
  process.exit(1);
}

const srcDir = path.join(nethereumRoot, 'src');
const docsBase = path.join(__dirname, '..', 'docs');

if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

// Explicit package-to-category map derived from COMPONENTS.md sections.
// One line per package. When a new package is added, add one line here.
const PACKAGE_CATEGORY = {
  // §1 Core Foundation
  'Nethereum.Web3': 'core-foundation',
  'Nethereum.ABI': 'core-foundation',
  'Nethereum.Contracts': 'core-foundation',
  'Nethereum.Accounts': 'core-foundation',
  'Nethereum.Model': 'core-foundation',
  'Nethereum.Hex': 'core-foundation',
  'Nethereum.RLP': 'core-foundation',
  'Nethereum.Util': 'core-foundation',
  'Nethereum.Util.Rest': 'core-foundation',
  'Nethereum.RPC': 'core-foundation',
  'Nethereum.RPC.Reactive': 'core-foundation',

  // §1 JSON-RPC Transport
  'Nethereum.JsonRpc.Client': 'json-rpc-transport',
  'Nethereum.JsonRpc.RpcClient': 'json-rpc-transport',
  'Nethereum.JsonRpc.SystemTextJsonRpcClient': 'json-rpc-transport',
  'Nethereum.JsonRpc.IpcClient': 'json-rpc-transport',
  'Nethereum.JsonRpc.WebSocketClient': 'json-rpc-transport',
  'Nethereum.JsonRpc.WebSocketStreamingClient': 'json-rpc-transport',

  // §2 Signing & Key Management
  'Nethereum.Signer': 'signing-and-key-management',
  'Nethereum.Signer.EIP712': 'signing-and-key-management',
  'Nethereum.Signer.Bls': 'signing-and-key-management',
  'Nethereum.Signer.Bls.Herumi': 'signing-and-key-management',
  'Nethereum.KeyStore': 'signing-and-key-management',
  'Nethereum.HDWallet': 'signing-and-key-management',
  'Nethereum.HdWallet': 'signing-and-key-management',
  'Nethereum.Signer.Ledger': 'signing-and-key-management',
  'Nethereum.Signer.Trezor': 'signing-and-key-management',
  'Nethereum.Signer.AWSKeyManagement': 'signing-and-key-management',
  'Nethereum.Signer.AzureKeyVault': 'signing-and-key-management',

  // §3 Smart Contracts (core contract interaction -> core-foundation, already listed)
  // §3 Protocols
  'Nethereum.ENS': 'protocols',
  'Nethereum.GnosisSafe': 'protocols',
  'Nethereum.Siwe': 'protocols',
  'Nethereum.Siwe.Core': 'protocols',
  'Nethereum.Circles': 'protocols',
  'Nethereum.GSN': 'protocols',
  'Nethereum.Optimism': 'protocols',

  // §3 DeFi
  'Nethereum.Uniswap': 'defi',
  'Nethereum.X402': 'defi',

  // §3 Code Generation
  'Nethereum.Generators': 'smart-contracts',
  'Nethereum.Generators.Net': 'smart-contracts',
  'Nethereum.Generators.JavaScript': 'smart-contracts',
  'Nethereum.Generators.DuoCode': 'smart-contracts',
  'Nethereum.Generators.ProtocolBuffers': 'smart-contracts',
  'Nethereum.Generators.UnitTests': 'smart-contracts',
  'Nethereum.Generator.Console': 'smart-contracts',
  'Nethereum.Autogen.ContractApi': 'smart-contracts',

  // §4 EVM Simulator
  'Nethereum.EVM': 'evm-simulator',
  'Nethereum.EVM.Contracts': 'evm-simulator',
  'Nethereum.EVM.Precompiles.Bls': 'evm-simulator',
  'Nethereum.EVM.Precompiles.Kzg': 'evm-simulator',

  // §5 DevChain (Core + Dev)
  'Nethereum.CoreChain': 'devchain',
  'Nethereum.CoreChain.RocksDB': 'devchain',
  'Nethereum.DevChain': 'devchain',
  'Nethereum.DevChain.Server': 'devchain',

  // §5 Application Chain
  'Nethereum.AppChain': 'application-chain',
  'Nethereum.AppChain.Server': 'application-chain',
  'Nethereum.AppChain.Sequencer': 'application-chain',
  'Nethereum.AppChain.Sync': 'application-chain',
  'Nethereum.AppChain.P2P': 'application-chain',
  'Nethereum.AppChain.P2P.DotNetty': 'application-chain',
  'Nethereum.AppChain.P2P.Server': 'application-chain',
  'Nethereum.AppChain.Policy': 'application-chain',
  'Nethereum.AppChain.Anchoring': 'application-chain',
  'Nethereum.Consensus.Clique': 'application-chain',

  // §6 Account Abstraction
  'Nethereum.AccountAbstraction': 'account-abstraction',
  'Nethereum.AccountAbstraction.Bundler': 'account-abstraction',
  'Nethereum.AccountAbstraction.Bundler.RocksDB': 'account-abstraction',
  'Nethereum.AccountAbstraction.Bundler.RpcServer': 'account-abstraction',
  'Nethereum.AccountAbstraction.SimpleAccount': 'account-abstraction',
  'Nethereum.AccountAbstraction.AppChain': 'account-abstraction',

  // §7 Data & Indexing
  'Nethereum.BlockchainProcessing': 'data-and-indexing',
  'Nethereum.BlockchainStore.EFCore': 'data-and-indexing',
  'Nethereum.BlockchainStore.Postgres': 'data-and-indexing',
  'Nethereum.BlockchainStore.SqlServer': 'data-and-indexing',
  'Nethereum.BlockchainStore.Sqlite': 'data-and-indexing',
  'Nethereum.BlockchainStorage.Processors': 'data-and-indexing',
  'Nethereum.BlockchainStorage.Processors.Postgres': 'data-and-indexing',
  'Nethereum.BlockchainStorage.Processors.SqlServer': 'data-and-indexing',
  'Nethereum.BlockchainStorage.Processors.Sqlite': 'data-and-indexing',
  'Nethereum.BlockchainStorage.Token.Postgres': 'data-and-indexing',
  'Nethereum.Explorer': 'data-and-indexing',
  'Nethereum.TokenServices': 'data-services',
  'Nethereum.DataServices': 'data-services',
  'Nethereum.Sourcify.Database': 'data-services',
  'Nethereum.ChainStateVerification': 'data-and-indexing',

  // §8 MUD Framework
  'Nethereum.Mud': 'mud-framework',
  'Nethereum.Mud.Contracts': 'mud-framework',
  'Nethereum.Mud.Repositories.EntityFramework': 'mud-framework',
  'Nethereum.Mud.Repositories.Postgres': 'mud-framework',
  'Nethereum.MudBlazorComponents': 'mud-framework',

  // §9 Wallet Connectivity
  'Nethereum.UI': 'wallet-connectivity',

  // §10 Wallet SDK (was wallet-and-ui)
  'Nethereum.Wallet': 'wallet-sdk',
  'Nethereum.Wallet.UI.Components': 'wallet-sdk',
  'Nethereum.Wallet.UI.Components.Blazor': 'wallet-sdk',
  'Nethereum.Wallet.UI.Components.Blazor.Trezor': 'wallet-sdk',
  'Nethereum.Wallet.UI.Components.Trezor': 'wallet-sdk',
  'Nethereum.Wallet.UI.Components.Maui': 'wallet-sdk',
  'Nethereum.Wallet.RpcRequests': 'wallet-sdk',
  'Nethereum.Maui.AndroidUsb': 'wallet-sdk',

  // §9 Blazor dApp Integration (was web-and-browser-integration)
  'Nethereum.Blazor': 'blazor-dapp-integration',
  'Nethereum.Blazor.Solidity': 'blazor-dapp-integration',
  'Nethereum.EIP6963WalletInterop': 'blazor-dapp-integration',
  'Nethereum.Metamask': 'blazor-dapp-integration',
  'Nethereum.Metamask.Blazor': 'blazor-dapp-integration',
  'Nethereum.WalletConnect': 'blazor-dapp-integration',
  'Nethereum.Reown.AppKit.Blazor': 'blazor-dapp-integration',
  'Nethereum.HybridWebView': 'blazor-dapp-integration',

  // §9 Unity
  'Nethereum.Unity': 'unity',
  'Nethereum.Unity.EIP6963': 'unity',
  'Nethereum.Unity.Metamask': 'unity',

  // §10 Consensus & Cryptography
  'Nethereum.Merkle': 'consensus-and-cryptography',
  'Nethereum.Merkle.Patricia': 'consensus-and-cryptography',
  'Nethereum.Ssz': 'consensus-and-cryptography',
  'Nethereum.Consensus.LightClient': 'consensus-and-cryptography',
  'Nethereum.Beaconchain': 'consensus-and-cryptography',

  // §10 Client Extensions
  'Nethereum.Geth': 'client-extensions',
  'Nethereum.Besu': 'client-extensions',

  // Misc packages
  'Nethereum.BigInteger.N351': 'core-foundation',
  'Nethereum.Consensus.Ssz': 'consensus-and-cryptography',
  'Nethereum.Quorum': 'client-extensions',
  'Nethereum.RPC.Extensions': 'core-foundation',
};

// Generate a URL-friendly slug from a package name
function toSlug(pkg) {
  return pkg.toLowerCase().replace(/\./g, '-');
}

// Extract the first line that looks like a description from the README
function extractDescription(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('![')) continue;
    if (trimmed.startsWith('[![')) continue;
    if (/[a-zA-Z]{3,}/.test(trimmed)) {
      return trimmed.replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 200);
    }
  }
  return `${lines[0] || 'Package documentation'}`;
}

// Strip the first H1 heading
function stripFirstH1(content) {
  return content.replace(/^#\s+.*\n+/, '');
}

// Build lookup from package name to category slug (populated during first pass)
const pkgToCatSlug = {};

// Case-insensitive lookup for pkgToCatSlug
function findCatSlug(pkg) {
  if (pkgToCatSlug[pkg]) return pkgToCatSlug[pkg];
  const lower = pkg.toLowerCase();
  for (const [key, val] of Object.entries(pkgToCatSlug)) {
    if (key.toLowerCase() === lower) return val;
  }
  // Also check the explicit map
  for (const [key, val] of Object.entries(PACKAGE_CATEGORY)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

// Rewrite relative ../PackageName/README.md links to Docusaurus paths
function rewriteLinks(content, currentCatSlug) {
  return content.replace(
    /\(\.\.\/([Nn]ethereum\.[A-Za-z0-9.]+)\/README\.md(#[^)]+)?\)/g,
    (match, pkg, anchor) => {
      const targetCatSlug = findCatSlug(pkg);
      const slug = toSlug(pkg);
      const anchorPart = anchor || '';
      if (targetCatSlug && targetCatSlug !== currentCatSlug) {
        return `(../${targetCatSlug}/${slug}${anchorPart})`;
      }
      return `(${slug}${anchorPart})`;
    }
  );
}

// Collect section directories that will receive synced READMEs
const sectionDirs = new Set(Object.values(PACKAGE_CATEGORY));

// Clean synced README files from section directories (keeps overview.md and guide pages)
for (const section of sectionDirs) {
  const sectionPath = path.join(docsBase, section);
  if (!fs.existsSync(sectionPath)) continue;
  const files = fs.readdirSync(sectionPath);
  for (const f of files) {
    if (f.startsWith('nethereum-') && f.endsWith('.md')) {
      fs.unlinkSync(path.join(sectionPath, f));
    }
  }
}

// Also clean the old reference/ directory synced files
const oldRefDir = path.join(docsBase, 'reference');
if (fs.existsSync(oldRefDir)) {
  const refDirs = fs.readdirSync(oldRefDir, { withFileTypes: true });
  for (const d of refDirs) {
    if (d.isDirectory()) {
      const dirPath = path.join(oldRefDir, d.name);
      const files = fs.readdirSync(dirPath);
      if (files.every(f => f.endsWith('.md')) && files.some(f => f.startsWith('nethereum-'))) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
  }
}

// Find all README.md files - first pass to build category lookup
const entries = fs.readdirSync(srcDir, { withFileTypes: true });
const packageData = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  if (!entry.name.startsWith('Nethereum.')) continue;

  const readmePath = path.join(srcDir, entry.name, 'README.md');
  if (!fs.existsSync(readmePath)) continue;

  const content = fs.readFileSync(readmePath, 'utf8');
  if (content.trim().length < 50) continue;

  const pkg = entry.name;
  const catSlug = PACKAGE_CATEGORY[pkg];

  if (!catSlug) {
    console.warn(`WARNING: No category mapping for ${pkg} — defaulting to core-foundation`);
  }

  const finalCatSlug = catSlug || 'core-foundation';
  pkgToCatSlug[pkg] = finalCatSlug;

  packageData.push({ pkg, content, catSlug: finalCatSlug });
}

// Second pass: write files with correct cross-references
const packages = [];

for (const { pkg, content, catSlug } of packageData) {
  const slug = toSlug(pkg);
  const description = extractDescription(content);
  const body = rewriteLinks(stripFirstH1(content, pkg), catSlug);

  const catDir = path.join(docsBase, catSlug);
  fs.mkdirSync(catDir, { recursive: true });

  const frontmatter = [
    '---',
    `title: "${pkg}"`,
    `sidebar_label: "${pkg}"`,
    `sidebar_position: 100`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    `custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/${pkg}/README.md"`,
    'format: md',
    '---',
    '',
    `# ${pkg}`,
    '',
    `> **NuGet**: [\`${pkg}\`](https://www.nuget.org/packages/${pkg}/) | **Source**: [\`src/${pkg}/\`](https://github.com/Nethereum/Nethereum/tree/master/src/${pkg})`,
    '',
  ].join('\n');

  const outputPath = path.join(catDir, `${slug}.md`);
  fs.writeFileSync(outputPath, frontmatter + body);

  packages.push({ pkg, slug, catSlug, description });
}

// Sort packages alphabetically
packages.sort((a, b) => a.pkg.localeCompare(b.pkg));

console.log(`Synced ${packages.length} package READMEs to docs/<section>/`);

// Generate category index
const categories = {};
for (const p of packages) {
  if (!categories[p.catSlug]) categories[p.catSlug] = [];
  categories[p.catSlug].push(p);
}

console.log('\nPackages by section:');
for (const [cat, pkgs] of Object.entries(categories).sort()) {
  console.log(`  ${cat}/: ${pkgs.length}`);
}
