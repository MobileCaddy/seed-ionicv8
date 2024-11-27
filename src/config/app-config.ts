export interface IAppConfig {
  version: string;
  menuItems: menuItemsConfig[];
  indexSpecs?: indexSpecConfig[];
  initialSyncTables: string[];
  syncPoints: {[propName: string]: SyncPointConfig};
  outboxTables?: OutBoxTableConfig[];
  onResume?: OnResumeConfig;
  onNavigation?: OnNavigationConfig;
  onColdStart?: OnColdStartConfig;
  upgradeOptions?: UpgradeOptionsConfig;
  lockScreenOptions?: LockScreenOptionsConfig;
  platformPinChallengeOptions?: PlatformPinChallengeOptionsConfig;
  // tmp line for calling the platform for config
  usePlatformConfig?: boolean;
  config?: any;
  // BELOW HERE IS VERSIONS OF CONFIG WE GET FROM THE PLATFORM
  primaryMenu?: {instanceId:string};
}

export interface menuItemsConfig {
  title: string;
  url: any;
  icon?: any;
}

export interface indexSpecConfig {
  table: string;
  specs: Array<{ path: string; type: string }>;
}

export interface SyncPointConfig {
  skipSyncPeriod?: number; // Seconds
  appConfigSkipPeriod?: number // Seconds
  tableConfig: SyncTableConfig[];
}

export interface SyncTableConfig {
  Name: string;
  syncWithoutLocalUpdates?: boolean;
  maxTableAge?: number;
  maxRecsPerCall?: number; // Note, overrides the SyncPointConfig.skipSyncPeriod
  skipP2M?: boolean;
}

export interface OutBoxTableConfig {
  Name: string;
  DisplayName: string;
}

export interface RecentItemsConfig {
  maxItems?: number;
  encrypted?: boolean;
  tables?: any;
}

export interface PageConfig {
  id: string; // Name of the page from the navCtrl
  syncPoint?: string;
  showSyncLoader?: boolean; // default false
  skipSyncPeriod?: number; // Number of secs - If last successful sync was in this time then we don’t sync
  allowUpgrade?: boolean;
}

export interface OnResumeConfig {
  checkPausePeriod?: boolean;
  maxPausePeriod?: number;
  presentLockScreen?: boolean;
  pages?: PageConfig[];
}

export interface OnNavigationConfig {
  checkPausePeriod?: boolean;
  maxPausePeriod?: number;
  presentLockScreen?: boolean;
  pages?: PageConfig[];
}

export interface OnColdStartConfig {
  checkPausePeriod?: boolean;
  maxPausePeriod?: number;
  presentLockScreen?: boolean;
  showSyncLoader?: boolean;
  showBuildMsgs?: boolean;
  upgradeCheck?: boolean;
}

export interface UpgradeOptionsConfig {
  ignoreRepromptPeriod?: boolean;
  maxPostpones?: number;
  noRepromptPeriod?: number;
  popupText?: string[];
}

export interface LockScreenOptionsConfig {
  lockScreenText?: string[];
  lockScreenAttempts?: number;
  getCodePopupText?: string[];
}

export interface PlatformPinChallengeOptionsConfig {
  bypassChallenge?: boolean;
  timeoutPeriod?: number;
  showCancel?: boolean;
  maxAttempts?: number;
  popupText?: string[];
  alertOptions?: any;
  toastOptions?: any;
}


const oneMinute: number = 1000 * 60;
const fiveMinutes: number = oneMinute * 5;
const eightHours: number = oneMinute * 60 * 8;

export const AppConfig: IAppConfig = {
  version: '1.0.0',

  menuItems: [    
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Projects', url: '/projects', icon: 'person' }
  ],

  // Set our own indexSpecs. Not each field that appears in a WHERE clause is needed.
  indexSpecs: [
    {
      table: 'MC_Project__ap',
      specs: [
        {"path": "Id","type":"string"},
        {"path":"Name","type":"string"},
        {"path":"mobilecaddy1__Status__c","type":"string"}
      ]
    }
  ],

  // Tables to sync on initialSync
  initialSyncTables: [
    'MC_Project__ap',
    'MC_Project_Location__ap'
  ],

  syncPoints: {
    'coldStart': {
      skipSyncPeriod: 60,
      appConfigSkipPeriod: 60,
      tableConfig: [
        {
          Name: 'MC_Project__ap',
          syncWithoutLocalUpdates: true,
          maxTableAge: oneMinute
        },
        {
          Name: 'MC_Project_Location__ap',
          syncWithoutLocalUpdates: true,
          maxTableAge: oneMinute
        }
      ]
    },
    'forceSync': {
      tableConfig: [
        {
          Name: 'MC_Project__ap',
          syncWithoutLocalUpdates: true,
          maxTableAge: oneMinute
        }
      ]
    },
    'resumeSync' : {
      skipSyncPeriod: 60,
      appConfigSkipPeriod: 60,
      tableConfig: [
        {
          Name: 'MC_Project__ap',
          syncWithoutLocalUpdates: true,
          maxTableAge: fiveMinutes
        }
      ]
    }
  },

  outboxTables: [
  ],


  onResume: {
    checkPausePeriod: true,
    maxPausePeriod: 0,
    presentLockScreen: false,
    pages: [
      {
        id: 'start.ts',
        syncPoint: 'resumeSync',
        showSyncLoader: false,
        allowUpgrade: true
      }
    ]
  },

  onNavigation: {
    checkPausePeriod: false,
    maxPausePeriod: 0,
    presentLockScreen: false,
    pages: [
      {
        id: 'test-mc-resume.ts',
        syncPoint: 'mySync',
        showSyncLoader: true,
        allowUpgrade: true
      }
    ]
  },

  onColdStart: {
    checkPausePeriod: true,
    maxPausePeriod: 0,
    presentLockScreen: false,
    showSyncLoader: false,
    showBuildMsgs: false,
    upgradeCheck: true
  },

  upgradeOptions: {
    ignoreRepromptPeriod: false,
    maxPostpones: 0,
    noRepromptPeriod: 1000 * 60 * 5,
    popupText: [
      'New version available',
      'Press Accept to continue',
      'Not just now',
      'Accept',
      'Upgrading...',
      'Upgrade',
      'The upgrade could not take place due to sync in progress. Please try again later.',
      'OK'
    ]
  },

  // tmp line for calling the platform for config
  usePlatformConfig: false
};


