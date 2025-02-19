import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Connection,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";

interface TokenChanges {
  [mint: string]: number;
}

interface BalanceChange {
  solChange: number;
  tokenChanges: TokenChanges;
}

interface TransactionBalanceChanges {
  [account: string]: BalanceChange;
}

interface TokenInfo {
  mint: string;
  balance: number;
  decimals: number;
  symbol?: string;
  name?: string;
}

export function shortenAddress(address: string) {
  return address.slice(0, 10);
}

export function isSolanaAddress(address: string) {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const { amount, decimals } = await getTokenBalanceRaw(
      connection,
      owner,
      mint
    );

    return Number(amount) / Math.pow(10, decimals);
  } catch (error) {
    console.error("Error getting token balance:", error);
    throw error;
  }
}

export async function getTokenBalanceRaw(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<{
  amount: BN;
  decimals: number;
}> {
  try {
    // Find token account address
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      owner,
      {
        mint: mint,
      },
      "processed"
    );

    // If no token account is found, return 0
    if (tokenAccounts.value.length === 0) {
      return {
        amount: new BN(0),
        decimals: 0,
      };
    }

    // Get balance info from the first token account
    const tokenAccount = tokenAccounts.value[0];
    const accountInfo = await connection.getTokenAccountBalance(
      tokenAccount.pubkey,
      "processed"
    );

    return {
      amount: new BN(accountInfo.value.amount),
      decimals: accountInfo.value.decimals,
    };
  } catch (error) {
    console.error("Error getting token balance:", error);
    throw error;
  }
}

export async function getSolBalance(
  connection: Connection,
  address: PublicKey
): Promise<number> {
  try {
    const balance = await connection.getBalance(address, "processed");
    // Convert from lamports to SOL (1 SOL = 1e9 lamports)
    return balance / 1e9;
  } catch (error) {
    console.error("Error getting SOL balance:", error);
    throw error;
  }
}

export function getSolscanLink({
  txHash,
  account,
}: {
  txHash?: string;
  account?: string;
}): string {
  // Check if rpcUrl includes 'devnet'
  const isDevnet = process.env.RPC_URL.toLowerCase().includes("devnet");

  if (txHash) {
    const baseUrl = isDevnet
      ? `https://solscan.io/tx/${txHash}?cluster=devnet`
      : `https://solscan.io/tx/${txHash}`;

    return `${baseUrl}`;
  }

  const baseUrl = isDevnet
    ? `https://solscan.io/account/${account}?cluster=devnet`
    : `https://solscan.io/account/${account}`;

  return `${baseUrl}`;
}

export async function parseTransactionWithTokens(
  connection: Connection,
  transactionSignature: string
): Promise<TransactionBalanceChanges> {
  try {
    const transaction: ParsedTransactionWithMeta | null =
      await connection.getParsedTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const balanceChanges: TransactionBalanceChanges = {};

    // Handle SOL balance changes
    transaction.meta?.preBalances.forEach((preBalance, index) => {
      const postBalance = transaction.meta?.postBalances[index];
      const account =
        transaction.transaction.message.accountKeys[index].pubkey.toBase58();

      if (postBalance !== undefined) {
        const solChange = (postBalance - preBalance) / 1e9; // Convert lamports to SOL
        if (!balanceChanges[account]) {
          balanceChanges[account] = { solChange: 0, tokenChanges: {} };
        }
        balanceChanges[account].solChange = solChange;
      }
    });

    // Track token accounts and their owners
    const tokenAccountOwners: { [tokenAccount: string]: string } = {};

    // First pass: collect token account owners from instructions
    transaction.transaction.message.accountKeys.forEach((key, index) => {
      const innerInstructions = transaction.meta?.innerInstructions || [];
      innerInstructions.forEach((inner) => {
        inner.instructions.forEach((inst) => {
          if (inst.programId.toString() === "spl-token" && "parsed" in inst) {
            const parsed = inst.parsed;
            if (
              parsed.type === "initializeAccount3" &&
              parsed.info.owner &&
              parsed.info.account
            ) {
              tokenAccountOwners[parsed.info.account] = parsed.info.owner;
            }
          }
        });
      });
    });

    // Handle token balance changes
    transaction.meta?.postTokenBalances?.forEach((postBalance) => {
      const preBalance = transaction.meta?.preTokenBalances?.find(
        (pre) =>
          pre.accountIndex === postBalance.accountIndex &&
          pre.mint === postBalance.mint
      );

      const tokenAccount =
        transaction.transaction.message.accountKeys[
          postBalance.accountIndex
        ].pubkey.toBase58();

      // Get the actual owner of the tokens
      const owner = tokenAccountOwners[tokenAccount] || postBalance.owner;

      if (!balanceChanges[owner]) {
        balanceChanges[owner] = { solChange: 0, tokenChanges: {} };
      }

      const preAmount = preBalance
        ? Number(preBalance.uiTokenAmount.amount) /
          Math.pow(10, preBalance.uiTokenAmount.decimals)
        : 0;

      const postAmount =
        Number(postBalance.uiTokenAmount.amount) /
        Math.pow(10, postBalance.uiTokenAmount.decimals);

      const tokenChange = postAmount - preAmount;

      // Only record non-zero changes
      if (tokenChange !== 0) {
        balanceChanges[owner].tokenChanges[postBalance.mint] = tokenChange;
      }
    });

    return balanceChanges;
  } catch (error) {
    console.error("Error parsing transaction:", error);
    throw error;
  }
}

export async function getAllTokenBalances(
  connection: Connection,
  owner: PublicKey
): Promise<TokenInfo[]> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      owner,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token program ID
      },
      "processed"
    );

    const tokenInfos: TokenInfo[] = [];

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const balance =
        Number(parsedInfo.tokenAmount.amount) /
        Math.pow(10, parsedInfo.tokenAmount.decimals);

      if (balance > 0) {
        tokenInfos.push({
          mint: parsedInfo.mint,
          balance: balance,
          decimals: parsedInfo.tokenAmount.decimals,
        });
      }
    }

    return tokenInfos;
  } catch (error) {
    console.error("Error getting all token balances:", error);
    throw error;
  }
}
