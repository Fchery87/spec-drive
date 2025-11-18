// Mock database for testing with in-memory storage
const mockData: {
  users: any[];
  authSessions: any[];
  projects: any[];
  projectArtifacts: any[];
  rateLimitLog: any[];
  validationReports: any[];
  validationRules: any[];
} = {
  users: [],
  authSessions: [],
  projects: [],
  projectArtifacts: [],
  rateLimitLog: [],
  validationReports: [],
  validationRules: [],
};

// Helper to generate IDs
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// Create a realistic query chain
const createQueryChain = (tableName: keyof typeof mockData) => {
  const queryChain: any = {
    where: jest.fn((clause: any) => queryChain),
    limit: jest.fn((value: number) => queryChain),
    returning: jest.fn(() => Promise.resolve(mockData[tableName] || [])),
    then: (resolve: any) => Promise.resolve(mockData[tableName] || []).then(resolve),
  };
  return queryChain;
};

export const db = {
  select: jest.fn((fields?: any) => ({
    from: jest.fn((table: any) => {
      const tableName = table?.name || 'users';
      return createQueryChain(tableName as keyof typeof mockData);
    }),
  })),

  insert: jest.fn((table: any) => ({
    values: jest.fn((values: any) => {
      const tableName = table?.name || 'users';
      const newRecord = {
        id: generateId(),
        ...values,
        createdAt: values.createdAt || new Date(),
        updatedAt: values.updatedAt || new Date(),
      };

      if (mockData[tableName as keyof typeof mockData]) {
        (mockData[tableName as keyof typeof mockData] as any[]).push(newRecord);
      }

      return {
        returning: jest.fn().mockResolvedValue([newRecord]),
        then: (resolve: any) => Promise.resolve([newRecord]).then(resolve),
      };
    }),
  })),

  update: jest.fn((table: any) => ({
    set: jest.fn((values: any) => ({
      where: jest.fn((clause: any) => {
        const updatedRecord = {
          id: 'mock-updated-id',
          ...values,
          updatedAt: new Date(),
        };

        return {
          returning: jest.fn().mockResolvedValue([updatedRecord]),
          then: (resolve: any) => Promise.resolve([updatedRecord]).then(resolve),
        };
      }),
    })),
  })),

  delete: jest.fn((table: any) => ({
    where: jest.fn((clause: any) => {
      const tableName = table?.name || 'users';
      // Clear the mock data for this table
      if (mockData[tableName as keyof typeof mockData]) {
        (mockData[tableName as keyof typeof mockData] as any[]) = [];
      }

      return {
        returning: jest.fn().mockResolvedValue([]),
        then: (resolve: any) => Promise.resolve([]).then(resolve),
      };
    }),
  })),

  execute: jest.fn().mockResolvedValue({ rows: [] }),

  query: {
    users: {
      findFirst: jest.fn(({ where }: any) => Promise.resolve(mockData.users[0] || null)),
      findMany: jest.fn(() => Promise.resolve(mockData.users)),
    },
    projects: {
      findFirst: jest.fn(() => Promise.resolve(mockData.projects[0] || null)),
      findMany: jest.fn(() => Promise.resolve(mockData.projects)),
    },
    authSessions: {
      findFirst: jest.fn(() => Promise.resolve(mockData.authSessions[0] || null)),
      findMany: jest.fn(() => Promise.resolve(mockData.authSessions)),
    },
  },
};

// Mock reset function for tests
export const resetMockDb = () => {
  // Clear all mock data
  Object.keys(mockData).forEach((key) => {
    (mockData as any)[key] = [];
  });

  // Clear jest mocks
  Object.values(db).forEach((method) => {
    if (typeof method === 'function' && 'mockClear' in method) {
      (method as jest.Mock).mockClear();
    }
  });
};

// Export mock data for test inspection
export const getMockData = () => mockData;
