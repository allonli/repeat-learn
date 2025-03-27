// Mock electron modules
jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn()
  }
}));

// Mock @electron/remote
jest.mock('@electron/remote', () => ({
  dialog: {
    showOpenDialogSync: jest.fn()
  }
}));

// Mock DOM APIs
global.MediaSource = class MediaSource {};
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn()
};

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn()
};
global.sessionStorage = sessionStorageMock; 