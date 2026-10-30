/**
 * Phase 0 TDD Specification Runner for Grant Surveyor AI Firestore Security Rules
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_SUITE: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on UserWorkspace',
    collectionPath: '/users/user_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_1',
      displayName: 'Researcher',
      proUnlocked: false,
      csvAndAnalyticsUnlocked: false,
      complianceCredits: 0,
      savedIds: [],
      unlockedBlueprints: ['guide-1'],
      digestCadence: 'Weekly',
      digestRegion: 'ALL',
      digestSubject: 'ALL',
      isAdmin: true, // Ghost field
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on UserOpportunity',
    collectionPath: '/userOpportunities/opp_1',
    operation: 'create',
    authUid: 'attacker_uid',
    emailVerified: true,
    payload: {
      ownerId: 'victim_uid',
      title: 'Spoofed Grant',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write on UserWorkspace',
    collectionPath: '/users/user_unverified',
    operation: 'create',
    authUid: 'user_unverified',
    emailVerified: false,
    payload: {
      ownerId: 'user_unverified',
      displayName: 'Unverified User',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-User PII Read on Private Info',
    collectionPath: '/users/victim_uid/private/info',
    operation: 'get',
    authUid: 'attacker_uid',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write without Parent UserWorkspace',
    collectionPath: '/users/non_existent_user/private/info',
    operation: 'create',
    authUid: 'non_existent_user',
    emailVerified: true,
    payload: {
      ownerId: 'non_existent_user',
      email: 'researcher@uni.edu',
      subscriberEmail: 'researcher@uni.edu',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Path ID Poisoning with Invalid Characters',
    collectionPath: '/userOpportunities/invalid$id!@#',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: { ownerId: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unbounded Array Exhaustion on savedIds',
    collectionPath: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      savedIds: Array.from({ length: 65 }, (_, i) => `opp-${i}`),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Array Element Type Poisoning on savedIds',
    collectionPath: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      savedIds: [99999],
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Create',
    collectionPath: '/paymentReceipts/rcpt_1',
    operation: 'create',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'user_1',
      planLabel: 'All-Access Pro Tier',
      amountLabel: '$15.00',
      method: 'USDC',
      timestamp: '12:00 PM',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Tampering on Update',
    collectionPath: '/users/user_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      ownerId: 'another_user',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Bypass on Expired UserOpportunity',
    collectionPath: '/userOpportunities/expired_opp_1',
    operation: 'update',
    authUid: 'user_1',
    emailVerified: true,
    payload: {
      title: 'Modified After Expiration',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Payment Receipt Modification',
    collectionPath: '/paymentReceipts/rcpt_1',
    operation: 'delete',
    authUid: 'user_1',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
];
