
function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
}

async function testBatchLogic() {
  console.log('Testing batch logic (standalone)...');

  const addressToUsers: Record<string, string[]> = {
    '0x1': ['user1'],
    '0x2': ['user2'],
    '0x3': ['user1'], // user1 has multiple wallets
  };

  // Case 1: user1 receives NFT on 0x1, then transfers it from 0x3
  const userFinalState = new Map<string, boolean>();
  const activities = [
    { fromAddress: '0x0', toAddress: '0x1' }, // User receives on wallet 1
    { fromAddress: '0x3', toAddress: '0x2' }  // User sends from wallet 2
  ];

  activities.forEach((a) => {
    const fromAddr = a.fromAddress.toLowerCase();
    const toAddr = a.toAddress.toLowerCase();

    if (addressToUsers[fromAddr]) {
      addressToUsers[fromAddr].forEach((userId) => {
        userFinalState.set(userId, false);
      });
    }

    if (addressToUsers[toAddr]) {
      addressToUsers[toAddr].forEach((userId) => {
        userFinalState.set(userId, true);
      });
    }
  });

  assertEquals(userFinalState.get('user1'), false, 'User1 should NOT have NFT (transfer out was last)');
  assertEquals(userFinalState.get('user2'), true, 'User2 should have NFT');

  // Case 2: user1 transfers from 0x3, then receives on 0x1
  const userFinalState2 = new Map<string, boolean>();
  const activities2 = [
    { fromAddress: '0x3', toAddress: '0x2' }, // User sends from wallet 2
    { fromAddress: '0x0', toAddress: '0x1' }  // User receives on wallet 1
  ];

  activities2.forEach((a) => {
    const fromAddr = a.fromAddress.toLowerCase();
    const toAddr = a.toAddress.toLowerCase();

    if (addressToUsers[fromAddr]) {
      addressToUsers[fromAddr].forEach((userId) => {
        userFinalState2.set(userId, false);
      });
    }

    if (addressToUsers[toAddr]) {
      addressToUsers[toAddr].forEach((userId) => {
        userFinalState2.set(userId, true);
      });
    }
  });

  assertEquals(userFinalState2.get('user1'), true, 'User1 should have NFT (receive was last)');

  console.log('Batch logic tests (standalone) passed!');
}

testBatchLogic().catch(e => {
  console.error(e);
  process.exit(1);
});
