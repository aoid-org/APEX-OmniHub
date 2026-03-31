
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
              in: (col: string, vals: any[]) => {
                return {
                  ...queryBuilder,
                  then: (resolve: any) => resolve({ data: vals.map(v => ({ wallet_address: v, user_id: 'user-' + v })) })
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

// Optimized Logic (extracted from index.ts)
async function optimizedProcess(supabase: any, activities: any[], membershipNFTAddress: string) {
  const validActivities = activities.filter(
    (a) => a.contractAddress.toLowerCase() === membershipNFTAddress.toLowerCase()
  );
  if (validActivities.length === 0) return { processed: 0, skipped: activities.length };
  const activityWithIds = validActivities.map((a) => ({ ...a, eventId: `${a.log.transactionHash}-${a.log.logIndex}` }));
  const eventIds = activityWithIds.map((a) => a.eventId);
  const { data: existingEvents } = await supabase.from('chain_tx_log').select('id').in('id', eventIds);
  const existingIds = new Set((existingEvents || []).map((e: any) => e.id));
  const newActivities = activityWithIds.filter((a) => !existingIds.has(a.eventId));
  if (newActivities.length === 0) return { processed: 0, skipped: activities.length };
  const pendingLogs = newActivities.map((a) => ({ id: a.eventId, tx_hash: a.log.transactionHash, status: 'pending' }));
  await supabase.from('chain_tx_log').upsert(pendingLogs);

  try {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const allAddresses = new Set<string>();
    newActivities.forEach((a) => {
      if (a.fromAddress.toLowerCase() !== zeroAddress) allAddresses.add(a.fromAddress.toLowerCase());
      if (a.toAddress.toLowerCase() !== zeroAddress) allAddresses.add(a.toAddress.toLowerCase());
    });
    const { data: wallets } = await supabase.from('wallet_identities').select('wallet_address, user_id').in('wallet_address', Array.from(allAddresses));
    const addressToUsers: Record<string, string[]> = {};
    (wallets || []).forEach((w: any) => {
      const addr = w.wallet_address.toLowerCase();
      if (!addressToUsers[addr]) addressToUsers[addr] = [];
      addressToUsers[addr].push(w.user_id);
    });
    const userFinalState = new Map<string, boolean>();
    newActivities.forEach((a) => {
      const fromAddr = a.fromAddress.toLowerCase();
      const toAddr = a.toAddress.toLowerCase();
      if (fromAddr !== zeroAddress && addressToUsers[fromAddr]) addressToUsers[fromAddr].forEach((userId) => { userFinalState.set(userId, false); });
      if (toAddr !== zeroAddress && addressToUsers[toAddr]) addressToUsers[toAddr].forEach((userId) => { userFinalState.set(userId, true); });
    });
    const usersToRevoke = Array.from(userFinalState.entries()).filter(([_, hasNft]) => !hasNft).map(([userId]) => userId);
    const usersToGrant = Array.from(userFinalState.entries()).filter(([_, hasNft]) => hasNft).map(([userId]) => userId);
    const updatePromises = [];
    if (usersToRevoke.length > 0) updatePromises.push(supabase.from('profiles').update({ has_premium_nft: false }).in('id', usersToRevoke));
    if (usersToGrant.length > 0) updatePromises.push(supabase.from('profiles').update({ has_premium_nft: true }).in('id', usersToGrant));
    if (updatePromises.length > 0) await Promise.all(updatePromises);
    const processedIds = newActivities.map((a) => a.eventId);
    await supabase.from('chain_tx_log').update({ status: 'confirmed' }).in('id', processedIds);
    return { processed: newActivities.length, skipped: activities.length - newActivities.length };
  } catch (error) {
    const failedIds = newActivities.map((a) => a.eventId);
    await supabase.from('chain_tx_log').update({ status: 'failed' }).in('id', failedIds);
    throw error;
  }
}

// Generate test data (same as baseline)
const activities = Array.from({ length: 50 }, (_, i) => ({
  fromAddress: `0xfrom${i}`,
  toAddress: `0xto${i}`,
  contractAddress: '0xmembership',
  tokenId: `${i}`,
  log: { transactionHash: `0xhash${i}`, logIndex: `0x${i}` }
}));

async function main() {
  console.log('Running optimized benchmark...');
  const supabase = createMockSupabase();
  const start = performance.now();
  await optimizedProcess(supabase, activities, '0xmembership');
  const end = performance.now();

  console.log(`Optimized Results (50 activities):`);
  console.log(`Time: ${(end - start).toFixed(2)}ms`);
  console.log(`DB Calls:`, JSON.stringify(supabase.getCalls()));
}

main().catch(console.error);
