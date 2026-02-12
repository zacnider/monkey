import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { networkConfig, MONAD_CHAIN } from "@/lib/config";

const chain: Chain = {
  id: MONAD_CHAIN.id,
  name: MONAD_CHAIN.name,
  nativeCurrency: MONAD_CHAIN.nativeCurrency,
  rpcUrls: MONAD_CHAIN.rpcUrls,
};

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(networkConfig.rpcUrl),
});

let _operatorAccount: PrivateKeyAccount | null = null;
let _operatorWalletClient: WalletClient | null = null;

export function getOperatorAccount(): PrivateKeyAccount {
  if (!_operatorAccount) {
    const key = process.env.OPERATOR_PRIVATE_KEY;
    if (!key) {
      throw new Error("Missing OPERATOR_PRIVATE_KEY environment variable");
    }
    _operatorAccount = privateKeyToAccount(key as `0x${string}`);
  }
  return _operatorAccount;
}

export function getOperatorWalletClient(): WalletClient {
  if (!_operatorWalletClient) {
    const account = getOperatorAccount();
    _operatorWalletClient = createWalletClient({
      account,
      chain,
      transport: http(networkConfig.rpcUrl),
    });
  }
  return _operatorWalletClient;
}

export { chain as monadChain };
