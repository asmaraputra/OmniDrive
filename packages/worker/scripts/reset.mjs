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

export function resetD1(execSync, flag) {
  console.log(`\n=> Mereset D1 Database (${flag})...`);
  console.log('Menghapus semua tabel...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --command="PRAGMA writable_schema = 1; delete from sqlite_master where type in ('table', 'index', 'trigger'); PRAGMA writable_schema = 0; VACUUM;"`, { stdio: 'inherit' });
  
  console.log('Menerapkan schema baru...');
  execSync(`npx wrangler d1 execute omnidrive ${flag} --file=src/db/schema.sql`, { stdio: 'inherit' });
}
