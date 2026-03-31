
// Mock Supabase Client
const createMockSupabase = () => {
  const calls = {
    select: 0,
    upsert: 0,
    update: 0,
    from: 0,
  };

  const queryBuilder: any = {
    select: (fields: string) => { calls.select++; return queryBuilder; },
    eq: (col: string, val: any) => queryBuilder,
    in: (col: string, vals: any[]) => queryBuilder,
    maybeSingle: () => Promise.resolve({ data: null }),
    upsert: (data: any) => { calls.upsert++; return Promise.resolve({ error: null }); },
    update: (data: any) => { calls.update++; return queryBuilder; },
    then: (resolve: any) => resolve({ data: [] })
  };

  const client: any = {
    from: (table: string) => {
      calls.from++;
      if (table === 'wallet_identities') {
        return {
          ...queryBuilder,
          select: (fields: string) => {
            calls.select++;
            return {
              ...queryBuilder,
              eq: (col: string, val: any) => {
                return {
                  ...queryBuilder,
                  then: (resolve: any) => resolve({ data: [{ user_id: 'user-' + val }] })
                };
              }
            };
          }
        };
      }
      return queryBuilder;
    },
    getCalls: () => calls,
  };

  return client;
};

// Original Logic (simplified for benchmark)
async function originalProcess(supabase: any, activities: any[], membershipNFTAddress: string) {
  let processed = 0;
  let skipped = 0;

  async function processNFTTransfer(supabase: any, activity: any, membershipNFTAddress: string) {
    const { fromAddress, toAddress, contractAddress, tokenId, log } = activity;
    if (contractAddress.toLowerCase() !== membershipNFTAddress.toLowerCase()) {
      return { success: false, reason: 'contract_mismatch' };
    }
    const eventId = `${log.transactionHash}-${log.logIndex}`;
    const { data: existingEvent } = await supabase.from('chain_tx_log').select('id, status').eq('id', eventId).maybeSingle();
    if (existingEvent) return { success: true, reason: 'already_processed' };

    await supabase.from('chain_tx_log').upsert({ id: eventId, tx_hash: log.transactionHash, status: 'pending' });

    try {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (fromAddress.toLowerCase() !== zeroAddress) {
        const { data: fromWallets } = await supabase.from('wallet_identities').select('user_id').eq('wallet_address', fromAddress.toLowerCase());
        if (fromWallets && fromWallets.length > 0) {
          await supabase.from('profiles').update({ has_premium_nft: false }).in('id', fromWallets.map((w: any) => w.user_id));
        }
      }
      if (toAddress.toLowerCase() !== zeroAddress) {
        const { data: toWallets } = await supabase.from('wallet_identities').select('user_id').eq('wallet_address', toAddress.toLowerCase());
        if (toWallets && toWallets.length > 0) {
          await supabase.from('profiles').update({ has_premium_nft: true }).in('id', toWallets.map((w: any) => w.user_id));
        }
      }
      await supabase.from('chain_tx_log').update({ status: 'confirmed' }).eq('id', eventId);
      return { success: true };
    } catch (e) {
      await supabase.from('chain_tx_log').update({ status: 'failed' }).eq('id', eventId);
      return { success: false };
    }
  }

  for (const activity of activities) {
    const result = await processNFTTransfer(supabase, activity, membershipNFTAddress);
    if (result.success) processed++; else skipped++;
  }
  return { processed, skipped };
}

// Generate test data
const activities = Array.from({ length: 50 }, (_, i) => ({
  fromAddress: `0xfrom${i}`,
  toAddress: `0xto${i}`,
  contractAddress: '0xmembership',
  tokenId: `${i}`,
  log: { transactionHash: `0xhash${i}`, logIndex: `0x${i}` }
}));

async function main() {
  console.log('Running baseline benchmark...');
  const supabase = createMockSupabase();
  const start = performance.now();
  await originalProcess(supabase, activities, '0xmembership');
  const end = performance.now();

  console.log(`Baseline Results (50 activities):`);
  console.log(`Time: ${(end - start).toFixed(2)}ms`);
  console.log(`DB Calls:`, JSON.stringify(supabase.getCalls()));
}

main().catch(console.error);
