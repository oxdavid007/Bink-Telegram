export function parseString(str: string) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return [];
  }
}

export function makeId(length: number) {
  let result = '';
  const characters = '123456789abcdefghijkmnopqrstuvwxyz';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function chunk<T>(array: T[], chunkSize: number): T[][] {
  const chunked = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunked.push(array.slice(i, i + chunkSize));
  }

  return chunked;
}

export function generateSlug(input: string) {
  const words = input?.trim()?.split(' ');
  // Create a new string starting with "output"
  let newString = '';
  // Iterate through each word in the original string
  for (let i = 0; i < words.length; i++) {
    if (i === 0) {
      newString = words[i];
      continue;
    }
    newString += '-' + words[i];
  }
  return (
    newString
      .toLowerCase()
      .replace(/[^\w\s]/gi, '-')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/ /g, '-') +
    '-' +
    new Date().getTime().toString()
  );
}

export function getScanUrl(network: string, txHash: string): string {
  const scanUrls = {
    bnb: `https://bscscan.com/tx/${txHash}`,
    ethereum: `https://etherscan.io/tx/${txHash}`,
    solana: `https://solscan.io/tx/${txHash}`,
  };
  return scanUrls[network] || `${txHash}`;
}

export function getNetwork(network: string): string {
  if (!network) return 'Unknown';

  const networkMap = {
    bnb: 'Bnb Chain',
    ethereum: 'Ethereum',
    solana: 'Solana'
  };

  return networkMap[network] || network.charAt(0).toUpperCase() + network.slice(1);
}
