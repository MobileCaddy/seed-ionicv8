/**
 * Startup Service
 *
 * @description Handles initialising the app (build tables etc), and handling cold starts.
 * Checks to see if an initialSync has been completed. If not it
 * call initialSync using config from /app/app.config. A loader is show whilst the sync
 * is in progress and an event is emitted when complete.
 * If the intialSync has already completed then the 'initialLoadComplete' event is
 * emitted straight away.
 * 
 */
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { SyncService } from './sync.service';
import { startup, getStatus } from 'mobilecaddy-utils/startup';

declare let cordova: any;

export enum runState {
  InitialSync = 0,
  ColdStart = 1,
  Running = 2
}

const LOG_TAG = 'startup.service.ts';

@Injectable({
  providedIn: 'root'
})
export class StartupService {
  public initStatus: BehaviorSubject<string | any> = new BehaviorSubject('');
  private internalInitStatus: Array<string> = [];
  private statusPoll:any = () => {};
  private pollId: any = 0;
  private config: any;
  private runAlready: boolean = false;
  private currentRunState: runState = runState.InitialSync;

  constructor(
    public platform: Platform,
    private SyncService: SyncService,
  ) {
    this.initStatus.next(undefined);
  }

  startup(config:any): runState {
    this.currentRunState = this.getRunState();
    console.log(LOG_TAG, 'startup', this.runAlready, this.currentRunState);

    if (this.currentRunState !== runState.Running) {
      this.runAlready = true;
      // Set our config in config.service, so that it is available to all
      // this.MobileCaddyConfigService.setConfig(config);
      this.config = config;

      if ((<any>window)['LOCAL_DEV']) {
        console.log('Running in CodeFlow');

        this.pollId = window.setTimeout(
          (this.statusPoll = () => {
            this.internalInitStatus = getStatus();
            console.log(LOG_TAG, 'getStatus', this.internalInitStatus);
            if (this.internalInitStatus &&
              (this.internalInitStatus[0]=="Creating CodeFlow records" ||
              this.internalInitStatus[0]=='Preparing platform')
              ) {
              return;
            }
            this.initStatus.next({
              status: -1,
              info: this.internalInitStatus[0]
            });
            this.pollId = setTimeout(this.statusPoll, 100);
          }),
          100
        );

        // Running in CodeFlow
        startup(null)
          .then((res: any) => {
            console.log(LOG_TAG, 'res', res);
            return this.setConfig();
          })
          .then((res: any) => {
            this.runSync();
            window.clearTimeout(this.pollId);
          })
          .catch((e: any) => {
            window.clearTimeout(this.pollId);
            console.error(LOG_TAG, e);
          });
      } else {
        // On a device, wait for platform.ready()
        this.pollId = window.setTimeout(
          (this.statusPoll = () => {
            this.internalInitStatus = getStatus();
            console.log(LOG_TAG, 'getStatus', this.internalInitStatus);
            this.initStatus.next({
              status: -1,
              info: this.internalInitStatus[0]
            });
            this.pollId = setTimeout(this.statusPoll, 100);
          }),
          100
        );

        this.platform
          .ready()
          .then(readySource => {
            console.log(LOG_TAG, 'Platform ready from', readySource);
            return startup(null);
          })
          .then(res => {
            return this.setConfig();
          })
          .then(res => {
            this.runSync();
            window.clearTimeout(this.pollId);
            console.log(LOG_TAG, 'res', res);
          })
          .catch(e => {
            window.clearTimeout(this.pollId);
            console.error(LOG_TAG, e);
          });
      }
    }
    return this.currentRunState;
  }

  getInitState(): BehaviorSubject<String | any> {
    return this.initStatus;
  }

  /**
   * @description Does not do anything just yet.
   */
  private setConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  private runSync() {
    if (this.currentRunState == runState.ColdStart) {
      // Clear the file directory path cache entry - needed for iOS (we think)
      localStorage.removeItem('mcFileStorageDirectory');
      localStorage.removeItem('cdvFileURI');

      // Check if we need to check for upgrade.
      // If so then request one (note may not take place if we have dirty tables)
      if (this.config?.onColdStart?.upgradeCheck) {
        console.log(LOG_TAG, 'Requesting upgrade');
        // In MobileCaddy we use a config file to determine behaviour, so the same code can be used throughout apps
      } else {
        this.doColdStartSync();
      }
    } else {
      this.doInitialSync();
    }
  }

  private doInitialSync(): void {
    console.log(LOG_TAG, 'doInitialSync');

    this.SyncService.getSyncState().subscribe(res => {
      this.initStatus.next(res);
    });

    this.maybeAlterIndexSpecs().then(_ => {
      this.SyncService.doInitialSync();
    });
  }

  private doColdStartSync(): void {
    console.log(LOG_TAG, 'doColdStartSync');

    this.SyncService.getSyncState().subscribe(res => {
      this.initStatus.next(res);
    });

    this.SyncService.doColdStartSync();
  }

  private maybeAlterIndexSpecs(): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('maybeAlterIndexSpecs', this.config.indexSpecs);
      if (this.config.indexSpecs) {
        const smartstore = (<any>window).smartstore ?
        (<any>window).smartstore :
        cordova.require('com.salesforce.plugin.smartstore');
        const pArray = this.config.indexSpecs.map((element: { table: any; specs: any; }) => {
          return new Promise((resolve, reject) => {
            smartstore.alterSoup(
              element.table,
              element.specs,
              true,
              function(r: any) {
                console.log('AlteredSoup OK');
                resolve('OK');
              },
              function(r: any) {
                console.error('AlteredSoup FAILED');
                reject(r);
              }
            );
          });
        });
        Promise.all(pArray).then(results => {
          console.log('results', results);
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  }

  private getRunState(): runState {
    if (this.runAlready) {
      return runState.Running;
    } else {
      if (this.SyncService.hasInitialSynCompleted()) {
        return runState.ColdStart;
      } else {
        return runState.InitialSync;
      }
    }
  }
}
