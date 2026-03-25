import {
  ChainNotConfiguredError,
  createConnector,
  extractRpcUrls,
  ProviderNotFoundError,
} from '@wagmi/core';
import type { EthereumProviderOptions } from '@walletconnect/ethereum-provider';
import {
  getAddress,
  numberToHex,
  SwitchChainError,
  UserRejectedRequestError,
} from 'viem';

type WalletConnectProvider = InstanceType<
  (typeof import('@walletconnect/ethereum-provider'))['EthereumProvider']
>;

type WalletConnectConnectorParameters = {
  isNewChainsStale?: boolean;
} & Omit<
  EthereumProviderOptions,
  'chains' | 'events' | 'optionalChains' | 'optionalEvents' | 'optionalMethods' | 'methods' | 'rpcMap' | 'showQrModal'
> &
  Partial<Pick<EthereumProviderOptions, 'showQrModal'>>;

type WalletConnectError = Error & {
  code?: number;
  cause?: { message?: string };
};

const NAMESPACE = 'eip155';

// Adapted from wagmi's WalletConnect connector so the app can keep the same
// runtime behavior without depending on the deprecated helper symbol.
export function walletConnectConnector(parameters: WalletConnectConnectorParameters) {
  const isNewChainsStale = parameters.isNewChainsStale ?? true;
  let provider_: WalletConnectProvider | undefined;
  let providerPromise: Promise<WalletConnectProvider | undefined> | undefined;
  let accountsChanged: ((accounts: string[]) => void) | undefined;
  let chainChanged: ((chainId: string) => void) | undefined;
  let connect: ((connectInfo: { chainId: string | number }) => void | Promise<void>) | undefined;
  let displayUri: ((uri: string) => void) | undefined;
  let sessionDelete: (() => void) | undefined;
  let disconnect: ((error?: Error) => void | Promise<void>) | undefined;

  return createConnector((config) => ({
    id: 'walletConnect',
    name: 'WalletConnect',
    type: 'walletConnect',
    async setup() {
      const provider = await this.getProvider().catch(() => null);
      if (!provider) return;

      if (!connect) {
        connect = this.onConnect.bind(this);
        provider.on('connect', connect);
      }

      if (!sessionDelete) {
        sessionDelete = this.onSessionDelete.bind(this);
        provider.on('session_delete', sessionDelete);
      }
    },
    async connect({ chainId, withCapabilities, ...rest } = {}) {
      try {
        const provider = await this.getProvider();
        if (!provider) throw new ProviderNotFoundError();

        if (!displayUri) {
          displayUri = this.onDisplayUri;
          provider.on('display_uri', displayUri);
        }

        let targetChainId = chainId;
        if (!targetChainId) {
          const state = (await config.storage?.getItem('state')) ?? {};
          const isChainSupported = config.chains.some((chain) => chain.id === (state as { chainId?: number }).chainId);
          targetChainId = isChainSupported ? (state as { chainId?: number }).chainId : config.chains[0]?.id;
        }

        if (!targetChainId) throw new Error('No chains found on connector.');

        const chainsStale = await this.isChainsStale();
        if (provider.session && chainsStale) {
          await provider.disconnect();
        }

        if (!provider.session || chainsStale) {
          const optionalChains = config.chains
            .filter((chain) => chain.id !== targetChainId)
            .map((chain) => chain.id);

          await provider.connect({
            optionalChains: [targetChainId, ...optionalChains],
            ...('pairingTopic' in rest ? { pairingTopic: rest.pairingTopic } : {}),
          });
          await this.setRequestedChainsIds(config.chains.map((chain) => chain.id));
        }

        const accounts = (await provider.enable()).map((account) => getAddress(account));

        let currentChainId = await this.getChainId();
        if (chainId && currentChainId !== chainId) {
          const nextChain = await this.switchChain?.({ chainId }).catch((error: WalletConnectError) => {
            if (
              error.code === UserRejectedRequestError.code &&
              error.cause?.message !== 'Missing or invalid. request() method: wallet_addEthereumChain'
            ) {
              throw error;
            }

            return { id: currentChainId };
          });
          currentChainId = nextChain?.id ?? currentChainId;
        }

        if (displayUri) {
          provider.removeListener('display_uri', displayUri);
          displayUri = undefined;
        }

        if (connect) {
          provider.removeListener('connect', connect);
          connect = undefined;
        }

        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this);
          provider.on('accountsChanged', accountsChanged);
        }

        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this);
          provider.on('chainChanged', chainChanged);
        }

        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this);
          provider.on('disconnect', disconnect);
        }

        if (!sessionDelete) {
          sessionDelete = this.onSessionDelete.bind(this);
          provider.on('session_delete', sessionDelete);
        }

        return {
          accounts: withCapabilities
            ? accounts.map((address) => ({ address, capabilities: {} }))
            : accounts,
          chainId: currentChainId,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/(user rejected|connection request reset)/i.test(message)) {
          throw new UserRejectedRequestError(error as Error);
        }

        throw error;
      }
    },
    async disconnect() {
      const provider = await this.getProvider();

      try {
        await provider?.disconnect();
      } catch (error) {
        if (!(error instanceof Error) || !/No matching key/i.test(error.message)) {
          throw error;
        }
      } finally {
        if (chainChanged) {
          provider?.removeListener('chainChanged', chainChanged);
          chainChanged = undefined;
        }

        if (disconnect) {
          provider?.removeListener('disconnect', disconnect);
          disconnect = undefined;
        }

        if (!connect) {
          connect = this.onConnect.bind(this);
          provider?.on('connect', connect);
        }

        if (accountsChanged) {
          provider?.removeListener('accountsChanged', accountsChanged);
          accountsChanged = undefined;
        }

        if (sessionDelete) {
          provider?.removeListener('session_delete', sessionDelete);
          sessionDelete = undefined;
        }

        await this.setRequestedChainsIds([]);
      }
    },
    async getAccounts() {
      const provider = await this.getProvider();
      return provider.accounts.map((account) => getAddress(account));
    },
    async getProvider({ chainId } = {}) {
      const initProvider = async () => {
        const optionalChains = config.chains.map((chain) => chain.id);
        if (!optionalChains.length) return undefined;

        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const provider = await EthereumProvider.init({
          ...parameters,
          disableProviderPing: true,
          optionalChains,
          projectId: parameters.projectId,
          rpcMap: Object.fromEntries(
            config.chains.map((chain) => {
              const [url] = extractRpcUrls({
                chain,
                transports: config.transports,
              });

              return [chain.id, url];
            }),
          ),
          showQrModal: parameters.showQrModal ?? true,
        });

        return provider as WalletConnectProvider;
      };

      if (!provider_) {
        providerPromise ??= initProvider();
        provider_ = await providerPromise;
        provider_?.events.setMaxListeners(Number.POSITIVE_INFINITY);
      }

      if (chainId) {
        await this.switchChain?.({ chainId });
      }

      return provider_;
    },
    async getChainId() {
      const provider = await this.getProvider();
      return provider.chainId;
    },
    async isAuthorized() {
      try {
        const [accounts, provider] = await Promise.all([this.getAccounts(), this.getProvider()]);

        if (!accounts.length) return false;

        const chainsStale = await this.isChainsStale();
        if (chainsStale && provider.session) {
          await provider.disconnect().catch(() => undefined);
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    async switchChain({ addEthereumChainParameter, chainId }) {
      const provider = await this.getProvider();
      if (!provider) throw new ProviderNotFoundError();

      const chain = config.chains.find((candidate) => candidate.id === chainId);
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

      try {
        await Promise.all([
          new Promise<void>((resolve) => {
            const listener = ({ chainId: currentChainId }: { chainId: number }) => {
              if (currentChainId === chainId) {
                config.emitter.off('change', listener);
                resolve();
              }
            };

            config.emitter.on('change', listener);
          }),
          provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: numberToHex(chainId) }],
          }),
        ]);

        const requestedChains = await this.getRequestedChainsIds();
        await this.setRequestedChainsIds([...requestedChains, chainId]);
        return chain;
      } catch (error) {
        const walletError = error as WalletConnectError;
        if (/(user rejected)/i.test(walletError.message)) {
          throw new UserRejectedRequestError(walletError);
        }

        try {
          const blockExplorerUrls = addEthereumChainParameter?.blockExplorerUrls
            ? addEthereumChainParameter.blockExplorerUrls
            : chain.blockExplorers?.default.url
              ? [chain.blockExplorers.default.url]
              : [];

          const rpcUrls = addEthereumChainParameter?.rpcUrls?.length
            ? addEthereumChainParameter.rpcUrls
            : [...chain.rpcUrls.default.http];

          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                blockExplorerUrls,
                chainId: numberToHex(chainId),
                chainName: addEthereumChainParameter?.chainName ?? chain.name,
                iconUrls: addEthereumChainParameter?.iconUrls,
                nativeCurrency: addEthereumChainParameter?.nativeCurrency ?? chain.nativeCurrency,
                rpcUrls,
              },
            ],
          });

          const requestedChains = await this.getRequestedChainsIds();
          await this.setRequestedChainsIds([...requestedChains, chainId]);
          return chain;
        } catch (addChainError) {
          throw new UserRejectedRequestError(addChainError as Error);
        }
      }
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        this.onDisconnect();
        return;
      }

      config.emitter.emit('change', {
        accounts: accounts.map((account) => getAddress(account)),
      });
    },
    onChainChanged(chain) {
      config.emitter.emit('change', { chainId: Number(chain) });
    },
    async onConnect(connectInfo) {
      const accounts = await this.getAccounts();
      config.emitter.emit('connect', {
        accounts,
        chainId: Number(connectInfo.chainId),
      });
    },
    async onDisconnect() {
      await this.setRequestedChainsIds([]);
      config.emitter.emit('disconnect');

      const provider = await this.getProvider();
      if (accountsChanged) {
        provider.removeListener('accountsChanged', accountsChanged);
        accountsChanged = undefined;
      }

      if (chainChanged) {
        provider.removeListener('chainChanged', chainChanged);
        chainChanged = undefined;
      }

      if (disconnect) {
        provider.removeListener('disconnect', disconnect);
        disconnect = undefined;
      }

      if (sessionDelete) {
        provider.removeListener('session_delete', sessionDelete);
        sessionDelete = undefined;
      }

      if (!connect) {
        connect = this.onConnect.bind(this);
        provider.on('connect', connect);
      }
    },
    onDisplayUri(uri) {
      config.emitter.emit('message', { type: 'display_uri', data: uri });
    },
    onSessionDelete() {
      this.onDisconnect();
    },
    getNamespaceChainsIds() {
      if (!provider_) return [];

      return (
        provider_.session?.namespaces[NAMESPACE]?.accounts?.map((account) =>
          Number.parseInt(account.split(':')[1] || '', 10),
        ) ?? []
      );
    },
    async getRequestedChainsIds() {
      return (await config.storage?.getItem(this.requestedChainsStorageKey)) ?? [];
    },
    async isChainsStale() {
      if (!isNewChainsStale) return false;

      const connectorChains = config.chains.map((chain) => chain.id);
      const namespaceChains = this.getNamespaceChainsIds();
      if (namespaceChains.length && !namespaceChains.some((id) => connectorChains.includes(id))) {
        return false;
      }

      const requestedChains = await this.getRequestedChainsIds();
      return !connectorChains.every((id) => requestedChains.includes(id));
    },
    async setRequestedChainsIds(chains) {
      await config.storage?.setItem(this.requestedChainsStorageKey, chains);
    },
    get requestedChainsStorageKey() {
      return `${this.id}.requestedChains`;
    },
  }));
}
