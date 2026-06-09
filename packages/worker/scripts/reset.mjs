import readline from 'readline';

export async function promptUser(isRemote) {
  if (!isRemote) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question("\x1b[31mPERINGATAN: Anda akan menghapus SELURUH data di PRODUCTION. Ketik 'YES' untuk melanjutkan: \x1b[0m", (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}
