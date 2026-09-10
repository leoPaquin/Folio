export const PROVIDER_GROUPS = ['Courtage', 'Gestion de portefeuille', 'Banques et caisses', 'Crypto et portefeuilles', 'Autre'] as const;
export type ProviderGroup = typeof PROVIDER_GROUPS[number];
export type Provider = { name: string; group: ProviderGroup; aliases: string[]; pdf?: boolean };

// These are tracking labels, not bank connections or promises of native export support.
// Sources and scope are recorded in docs/platforms.md.
const group = (category: ProviderGroup, entries: [string, string[]?][]): Provider[] => entries.map(([name, aliases = []]) => ({ name, group: category, aliases }));
export const PROVIDERS: Provider[] = [
  { name: 'Disnat', group: 'Courtage', aliases: ['Desjardins Courtage en ligne', 'Desjardins Online Brokerage'], pdf: true },
  ...group('Courtage', [
    ['Wealthsimple', ['Wealthsimple Trade']], ['BMO InvestorLine', ['BMO Ligne d’action', 'BMO Ligne d’action autogéré']],
    ['Questrade'], ['Qtrade', ['Qtrade Direct Investing']], ['RBC Placements en Direct', ['RBC Direct Investing']],
    ['TD Placements directs', ['TD Direct Investing']], ['TD Easy Trade'], ['CIBC Pro-Investisseurs', ["CIBC Investor’s Edge", "CIBC Investor's Edge"]],
    ['Scotia iTRADE'], ['Banque Nationale Courtage direct', ['BNCD', 'NBDB', 'National Bank Direct Brokerage']],
    ['Interactive Brokers', ['IBKR']], ['CI Direct Trading', ['Virtual Brokers']], ['Moomoo Canada', ['Moomoo']],
    ['Webull Canada', ['Webull']], ['Banque Laurentienne Courtage à escompte', ['BLCE', 'Laurentian Bank Discount Brokerage']],
  ]),
  ...group('Gestion de portefeuille', [
    ['Wealthsimple Gestion', ['Wealthsimple Invest', 'Wealthsimple Managed Investing']], ['BMO SmartFolio'], ['BMO adviceDirect'],
    ['RBC InvestEase'], ['Questwealth Portfolios', ['Questwealth']], ['CI Direct Investing', ['WealthBar']],
    ['Justwealth'], ['Qtrade Portefeuilles accompagnés', ['Qtrade Guided Portfolios', 'VirtualWealth']],
    ['RBC Dominion valeurs mobilières', ['RBC Dominion Securities']], ['BMO Nesbitt Burns'], ['Financière Banque Nationale', ['National Bank Financial']],
    ['Desjardins Gestion de patrimoine Valeurs mobilières', ['Desjardins Securities']], ['CIBC Wood Gundy'],
    ['ScotiaMcLeod'], ['Gestion de patrimoine TD', ['TD Wealth']], ['IG Gestion de patrimoine', ['IG Wealth Management', 'Investors Group']],
    ['Financière Sun Life', ['Sun Life']], ['Manuvie', ['Manulife']], ['Canada Vie', ['Canada Life']],
    ['iA Gestion de patrimoine', ['iA Wealth']], ['Raymond James'], ['Edward Jones'], ['CI Assante', ['Assante']],
  ]),
  ...group('Banques et caisses', [
    ['Desjardins'], ['BMO'], ['RBC'], ['TD'], ['CIBC'], ['Banque Scotia', ['Scotiabank']], ['Banque Nationale', ['National Bank']],
    ['Banque Laurentienne', ['Laurentian Bank']], ['Tangerine'], ['EQ Bank', ['Banque EQ']], ['Simplii Financial'],
    ['Alterna', ['Alterna Bank', 'Alterna Savings']], ['Vancity'], ['Meridian'], ['Coast Capital'], ['ATB Financial'],
  ]),
  ...group('Crypto et portefeuilles', [
    ['Wealthsimple Crypto'], ['Coinbase'], ['Kraken'], ['Crypto.com'], ['Coinsquare'], ['Ndax'], ['Newton'], ['Shakepay'], ['Netcoins'],
    ['Exodus'], ['Ledger'], ['Trezor'], ['MetaMask'], ['Trust Wallet'],
  ]),
  ...group('Autre', [['Manuel']]),
];
export const providerSearchKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function findProvider(value: string) {
  const key = providerSearchKey(value);
  return PROVIDERS.find(p => [p.name, ...p.aliases].some(name => providerSearchKey(name) === key));
}
export const normalizeProvider = (value: string) => findProvider(value)?.name || value.trim();
export const isCryptoProvider = (value: string) => findProvider(value)?.group === 'Crypto et portefeuilles';
export function searchProviders(query: string, category = '') {
  const key = providerSearchKey(query);
  return PROVIDERS.filter(p => (!category || p.group === category) && [p.name, ...p.aliases].some(name => providerSearchKey(name).includes(key)));
}
export const importAccountUrl = (accountId: string) => '/importations?compte=' + encodeURIComponent(accountId);
