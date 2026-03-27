export type WalletId = "gemwallet" | "xaman" | "crossmark";

export type WalletCapability =
  | "connect"
  | "disconnect"
  | "getAccount"
  | "signMessage"
  | "signTransaction"
  | "submitTransaction";

export type WalletNetwork = "mainnet" | "testnet" | "devnet" | "unknown";

export type WalletAccount = {
  address: string;
  publicKey?: string;
  network?: WalletNetwork;
};

export type WalletSignMessageResult = {
  signature: string;
};

export type WalletSignTransactionResult = {
  signedTransaction: unknown;
};

export type WalletSubmitTransactionResult = {
  hash?: string;
  result?: unknown;
};

export type WalletAdapter = {
  id: WalletId;
  name: string;
  icon?: string;
  capabilities: WalletCapability[];
  isInstalled(): Promise<boolean>;
  connect(): Promise<WalletAccount>;
  disconnect?: () => Promise<void>;
  getAccount?: () => Promise<WalletAccount | null>;
  signMessage?: (input: { message: string }) => Promise<WalletSignMessageResult>;
  signTransaction?: (input: {
    transaction: Record<string, unknown>;
  }) => Promise<WalletSignTransactionResult>;
  submitTransaction?: (input: {
    transaction: Record<string, unknown>;
  }) => Promise<WalletSubmitTransactionResult>;
};

export type WalletErrorCode =
  | "not_installed"
  | "unsupported_method"
  | "user_rejected"
  | "connection_failed"
  | "signing_failed"
  | "submission_failed"
  | "configuration_error";

export type WalletConnectError = Error & {
  code: WalletErrorCode;
  cause?: unknown;
};
