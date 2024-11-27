/**
 * MobileCaddy Sync Service
 *
 * @description 
 *
 * TODO:
 * - NG replace _.chain commented section with something native
 */
import { Injectable } from '@angular/core';
import { AppConfig, SyncPointConfig } from '../../config/app-config';
import * as devUtils from 'mobilecaddy-utils/devUtils';
import * as fileUtils from 'mobilecaddy-utils/fileUtils';
import * as syncRefresh from 'mobilecaddy-utils/syncRefresh';
import * as logger from 'mobilecaddy-utils/logger';
import { BehaviorSubject } from 'rxjs';

export interface SyncState {
  status: number;
  table?: string;
}

export interface SyncTableConfig {
  Name: string;
  syncWithoutLocalUpdates?: boolean;
  maxTableAge?: number;
  maxRecsPerCall?: number; // Note, overrides the SyncPointConfig.skipSyncPeriod
  skipP2M?: boolean;
}

const LOG_TAG = 'sync.service.ts';

@Injectable({
  providedIn: 'root'
})


export class SyncService {

  private HEARTBEAT_OK = 100100;
  private HEARTBEAT_EXCEPTION = 100101;
  private HEARTBEAT_FAILURE = 100102;
  private HEARTBEAT_NO_CONNECTION = 100103;
  private HEARTBEAT_NOT_DEVICE = 100104;
  private HEARTBEAT_REFRESHED_OK = 100105;

  initialSyncState: BehaviorSubject<string> = new BehaviorSubject('');
  syncState: BehaviorSubject<string | any> = new BehaviorSubject('');
  _syncState: string = '';
  // This callback is fired when a table starts syncing, and when it completes
  private syncCallback: Function = (state:string | SyncState) => {
    this.setSyncState(state);
  };

  constructor(
    ) {
    let startingSyncState = localStorage.getItem('initialSyncState');
    startingSyncState = (startingSyncState) ? startingSyncState : ''; 
      '';
    this.initialSyncState.next(startingSyncState);
    this.syncState.next('undefined');
  }

  doInitialSync(): void {
    logger.log(LOG_TAG, 'Calling initialSync');
    this.syncState.next('InitialSyncInProgress');
    devUtils
      .initialSync(
        AppConfig.initialSyncTables,
        this.syncCallback
      )
      .then(_res => {
        localStorage.setItem('initialSyncState', 'InitialLoadComplete');
        logger.log(LOG_TAG, 'InitialLoadComplete');
        this.initialSyncState.next('InitialLoadComplete');

        let timeNow = new Date().valueOf().toString();
        localStorage.setItem('lastSyncSuccess', timeNow);

        return this.downloadFiles(1);
      }).then(_res => {
        // console.log('this.downloadFiles', res);
        this.setSyncState('complete');
      }).catch(e => {
        // console.error(LOG_TAG, 'fileUtils.downloadFiles Error', e);
        logger.error(LOG_TAG, 'fileUtils.downloadFiles Error', e);
        this.setSyncState({status:999});
        setTimeout(() => {
          this.setSyncState('complete');
        }, 1000)
      });
  }

  downloadFiles(attempt: number): Promise<Array<{status: number}>> {
    return new Promise((resolve, reject) => {
      const MAX_ATTEMPTS = 4;
      console.log('downloadFiles', attempt);
      fileUtils.downloadFiles().then(res => {
        console.log('fileUtils.downloadFiles', res);
        const anyFailures  = res.some(el => {return el.status !== 200});
        // console.log('anyFailures', anyFailures);
        if (!anyFailures) {
          resolve(res);
        } else {
          if ( attempt <=  MAX_ATTEMPTS) {
            attempt++;
            setTimeout(() => {
              this.downloadFiles(attempt).then(res => {
                // console.log('this.downloadFiles', res);
                resolve(res);
              }).catch(e => {
                // console.error(LOG_TAG, 'this.downloadFiles1 Error', e);
                logger.error(LOG_TAG, 'this.downloadFiles1 Error', e);
                reject(e);
              })
            }, 3000);
          } else {
            // console.error("Download file error1: Hit max attempts")
            reject('Download file error1: Hit max attempts');
          }
        }
      }).catch(e => {
        logger.error(LOG_TAG, 'fileUtils.downloadFiles Error', e);
        if ( attempt <=  MAX_ATTEMPTS) {
          attempt++
          setTimeout(() => {
            this.downloadFiles(attempt).then(res => {
              logger.log('this.downloadFiles2', res);
              resolve(res);
            }).catch(e => {
              // console.error(LOG_TAG, 'this.downloadFiles2 Error', e);
              logger.error(LOG_TAG, 'this.downloadFiles2 Error', e);
              reject(e);
            })
          }, 3000);
        } else {
          // console.error("Download file error2: Hit max attempts")
          reject('Download file error2: Hit max attempts');
        }
      })
    });
  }

  doColdStartSync(): void {
    console.log(LOG_TAG, 'doColdStartSync');
    const mobileLogConfig: SyncTableConfig = {
      Name: 'Mobile_Log__mc',
      syncWithoutLocalUpdates: false
    };
    let coldStartTables = [mobileLogConfig].concat(AppConfig.syncPoints['coldStart'].tableConfig
    );
    let skipSyncPeriod: number = 60;
    const lastSyncSuccess = (localStorage.getItem('lastSyncSuccess')) ?
      localStorage.getItem('lastSyncSuccess') :
      0;
    if (skipSyncPeriod && lastSyncSuccess) {
      const timeNow = new Date().valueOf();
      if (
        timeNow >
        parseInt(lastSyncSuccess) +
          skipSyncPeriod * 1000
      ) {
        // TODO Have this pass in the full sync point config
        this.syncTables(coldStartTables).then(res => {
          // console.log(LOG_TAG, 'doColdStartSync1', res);
          this.setSyncState('complete');
        });
      } else {
        logger.log("Skipping cold start, too soon");
      }
    } else {
      // TODO Have this pass in the full sync point config
      this.syncTables(coldStartTables).then(res => {
        // console.log(LOG_TAG, 'doColdStartSync2', res);
        this.setSyncState('complete');
      });
    }
  }

  /**
   * @description Gets the tables to sync (from param or config). If from config it also
   *  checks for dirty records and whether or not the sync is not needed due to last sync
   *  being within the configured window.
   *
   * @param tablesToSync Either a string of a syncPoint or and array of table config.
   */
  syncTables(tablesToSync: SyncTableConfig[] | string): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.log(LOG_TAG, 'syncTables', tablesToSync);
      if (typeof tablesToSync == 'string') {
        // We have a syncPoint name
        let syncPointConfig = AppConfig.syncPoints['tablesToSync'];
        // Make sure sync point name is in config
        if (syncPointConfig) {
          const mobileLogConfig: SyncTableConfig = {
            Name: 'Mobile_Log__mc',
            syncWithoutLocalUpdates: false
          };
          let tablesToSyncConfig = syncPointConfig.tableConfig.concat([
            mobileLogConfig
          ]);
          tablesToSyncConfig = this.maybeAddSystemTables(tablesToSyncConfig);
          this.getDirtyTables().then(dirtyTables => {

            const lastSyncSuccess = (localStorage.getItem('lastSyncSuccess')) ?
              localStorage.getItem('lastSyncSuccess') :
              0
            if (
              syncPointConfig.skipSyncPeriod &&
              lastSyncSuccess&&
              dirtyTables.length === 0
            ) {
              const timeNow = new Date().valueOf();
              if (
                timeNow >
                parseInt(lastSyncSuccess) +
                  syncPointConfig.skipSyncPeriod * 1000
              ) {
                this.doSyncTables1(tablesToSyncConfig, dirtyTables, syncPointConfig).then(r => {
                  resolve(r);
                }).catch(e => reject(e));
              } else {
                resolve('not-syncing:too-soon');
              }
            } else {
              this.doSyncTables1(tablesToSyncConfig, dirtyTables, syncPointConfig).then(r => {
                resolve(r);
              }).catch(e => reject(e));
          }
          });
        } else {
          // No sync point name found in config
          resolve('not-syncing:no-sync-point-config');
        }
      } else {
        // We have an array of tables... so let's just sync
        let tablesToSyncConfig = this.maybeAddSystemTables(tablesToSync);

        syncRefresh.heartBeat(
          heartbeatResp => {
            const heartbeatRespStatus = heartbeatResp.status;
            // TODO REMOVE
            // logger.error('heartbeatRespStatus1', heartbeatRespStatus);

            if (
              heartbeatRespStatus == this.HEARTBEAT_OK ||
              heartbeatRespStatus == this.HEARTBEAT_NOT_DEVICE ||
              heartbeatRespStatus == this.HEARTBEAT_REFRESHED_OK) {

              this.doSyncTables(tablesToSyncConfig).then(res => {
                console.log('this.doSyncTables', res);
                return this.downloadFiles(1)
              }).then(res => {
                // console.log('this.downloadFiles', res);
                // logger.error('doSyncTables1', res);
                // this.setSyncState('complete');
                // if (!res || res.status == 100999) {
                //   // LocalNotificationService.setLocalNotification();
                // } else {
                //   // LocalNotificationService.cancelNotification();
                // }
                resolve(res);
              }).catch(e => {
                logger.error('e1', e);
                this.setSyncState({status:999});
                setTimeout(() => {
                  this.setSyncState('complete');
                }, 1000)
                reject(e)
              });
            } else {
              // HEARTBEAT WAS NOT OK - SO WE JUST CONTINUE
              // TODO - uncomment once we remove the earlier logger.error
              // logger.error('Heartbeat failed', heartbeatResp);
              this.setSyncState('complete');
              resolve(null);
            }
          },
          (heartbeatErr: any) => {
            // We should never come here, this second function is never called by the heartbeat code.
            logger.error("Heartbeat Err", heartbeatErr)
          }
        )
      }
    });
  }

  /**
   * @description Checks for new appconfig, and then syncs tables and downloads files.
   * @param tablesToSync Array of config for our tables that we want to sync
   * @param dirtyTables Array of names of dirty tables.
   */
  doSyncTables1(
    tablesToSyncConfig: SyncTableConfig[],
    dirtyTables: String[],
    mySyncPointConfig: SyncPointConfig
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let syncRes:any;
      syncRefresh.heartBeat(
        heartbeatResp => {
          const heartbeatRespStatus = heartbeatResp.status;
          // TODO REMOVE
          // logger.error('heartbeatRespStatus2', heartbeatRespStatus);

          if (
            heartbeatRespStatus == this.HEARTBEAT_OK ||
            heartbeatRespStatus == this.HEARTBEAT_NOT_DEVICE ||
            heartbeatRespStatus == this.HEARTBEAT_REFRESHED_OK) {
            logger.log("heartbeatResp", heartbeatResp);
            this.doSyncTables2(tablesToSyncConfig, dirtyTables).then(r => {
              syncRes = r;
              console.log('doSyncTables2', r);
              return this.downloadFiles(1)
            }).then(res => {
                this.setSyncState('complete');
              resolve(syncRes);
            }).catch(e => {
              logger.error('e2', e);
              reject(e)
            });
          } else {
            // HEARTBEAT WAS NOT OK - SO WE JUST CONTINUE
            // TODO - uncomment once we remove the earlier logger.error
            // logger.error('Heartbeat failed', heartbeatResp);
            this.setSyncState('complete');
            resolve(null);
          }
        },
        (heartbeatErr: any) => {
          console.error("Heartbeat Err", heartbeatErr)
        }
      )
    });
  }


  /**
   * @description Sorts dirtyTables to front of array, calls our sync, and updates the 'lastSyncSuccess',
   *  if applicable.
   * @param tablesToSync Array of config for our tables that we want to sync
   * @param dirtyTables Array of names of dirty tables.
   */
  doSyncTables2(
    tablesToSync: SyncTableConfig[],
    dirtyTables: String[]
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let tablesToSync2 = this.maybeReorderTables(tablesToSync, dirtyTables);
      this.doSyncTables(tablesToSync2).then(res => {
        // this.setSyncState('complete');
        if (
          res.length == tablesToSync2.length &&
          (res[res.length - 1].status == devUtils.SYNC_OK ||
            res[res.length - 1].status == 100497 ||
            (res[res.length - 1].status == 100402 &&
              res[res.length - 1].mc_add_status == 'no-sync-no-updates'))
        ) {
          let timeNow = new Date().valueOf().toString();
          localStorage.setItem('lastSyncSuccess', timeNow);
        }
        resolve(res);
      });
    });
  }

  doSyncTables(tablesToSync: SyncTableConfig[]): Promise<any> {
    // Check that we not syncLocked or have a sync in progress
    let syncLock = this.getSyncLock();
    // let syncState = this.getSyncState();
    if (syncLock == 'true' || this._syncState == 'syncing') {
      return Promise.resolve({ status: 100999 });
    } else {
      this.setSyncState('syncing');
      // $rootScope.$broadcast('syncTables', { result: 'StartSync' });
      //   this.tableSyncStatus.emit({ result: 'StartSync' });

      let stopSyncing = false;
      const sequence = Promise.resolve();

      let accum:Array<any> = [];
      return tablesToSync.reduce((sequence, table) => {
        // Set Defaults
        if (typeof table.maxTableAge == 'undefined') {
          // table.maxTableAge = 1000 * 60 * 1; // 3 minutes
          table.maxTableAge = 0; // 0
        }
        if (typeof table.maxRecsPerCall == 'undefined') {
          table.maxRecsPerCall = 200;
        }
        if (typeof table.skipP2M == 'undefined') {
          table.skipP2M = false;
        }
        return sequence
          .then(res => {
            logger.log(
              LOG_TAG,
              'doSyncTables inSequence',
              table,
              res,
              stopSyncing
            );
            // this.tableSyncStatus.emit({
            //   result: 'TableComplete ' + table.Name
            // });
            if (!stopSyncing) {
              return devUtils.syncMobileTable(
                table.Name,
                table.syncWithoutLocalUpdates,
                table.maxTableAge,
                table.maxRecsPerCall,
                table.skipP2M,
                this.syncCallback
              );
            } else {
              //console.log("skipping sync");
              return { status: 100999 };
            }
          })
          .then(resObject => {
            // console.log(LOG_TAG, resObject);
            switch (resObject.status) {
              case devUtils.SYNC_NOK:
              case devUtils.SYNC_ALREADY_IN_PROGRESS:
                if (
                  typeof resObject.mc_add_status == 'undefined' ||
                  resObject.mc_add_status != 'no-sync-no-updates'
                  // TODO Do we need 'sync-too-soon' in here?
                ) {
                  stopSyncing = true;
                  this.setSyncState('complete');
                }
            }
            // this.tableSyncStatus.emit({
            //   table: table.Name,
            //   result: resObject.status
            // });
            accum.push(resObject);
            return accum;
          })
          .catch(e => {
            console.error(LOG_TAG, 'doSyncTables', e);
            if (e.status != devUtils.SYNC_UNKONWN_TABLE) {
              stopSyncing = true;
              //   this.tableSyncStatus.emit({
              //     table: table.Name,
              //     result: e.status
              //   });
              this.setSyncState('complete');
            }
            return e;
          });
      }, Promise.resolve());
    }
  }

  getSyncLock(syncLockName = 'syncLock'): string {
    var syncLock = localStorage.getItem(syncLockName);
    if (syncLock === null) {
      syncLock = 'false';
      localStorage.setItem(syncLockName, syncLock);
    }
    return syncLock;
  }

  setSyncLock(syncLockName: string, status: string): void {
    if (!status) {
      status = syncLockName;
      syncLockName = 'syncLock';
    }
    localStorage.setItem(syncLockName, status);
  }

  getInitialSyncState(): BehaviorSubject<string> {
    return this.initialSyncState;
  }

  hasInitialSynCompleted(): boolean {
    return localStorage.getItem('initialSyncState') ? true : false;
  }

  getSyncState(): BehaviorSubject<String | any> {
    let syncState = localStorage.getItem('syncState');
    if (syncState === null) {
      syncState = 'complete';
      localStorage.setItem('syncState', syncState);
      return this.syncState;
    } else {
      if (syncState != 'syncing' && syncState != 'complete') {
        syncState = JSON.parse(syncState);
        this.setSyncState((syncState as string));
      }

      return this.syncState;
    }
  }

  setSyncState(status: string | SyncState): void {
    if (typeof status == 'object') {
      localStorage.setItem('syncState', JSON.stringify(status));
    } else {
      localStorage.setItem('syncState', status);
      this._syncState = status;
    }
    this.syncState.next(status);
  }



  /**
   * @returns Promise Resolves to outboxSummary[]
   */
  private getDirtyTables(): Promise<String[]> {
    return new Promise((resolve, reject) => {
      let dirtyTables:Array<string> = [];
      devUtils
        .readRecords('recsToSync', [])
        .then(resObject => {
          // TODO NG - FIND REPLACEMENT FOR THIS UNDERSCORE STUFF
          // let tableCount = _.chain(resObject.records)
          //   .countBy('Mobile_Table_Name')
          //   .value();

          // let summary = [];
          // for (var p in tableCount) {
          //   if (tableCount.hasOwnProperty(p) && p != 'Connection_Session__mc') {
          //     dirtyTables.push(p);
          //   }
          // }
          // resolve(dirtyTables);
          resolve([]);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  /**
   *
   * @param tablesToSync Array of table config from app.config
   * @param dirtyTables Array of table names that are dirty
   */
  private maybeReorderTables(
    tablesToSync: SyncTableConfig[],
    dirtyTables: String[]
  ) {
    let orderedTables:SyncTableConfig[] = [];
    let nonDirtyTables:SyncTableConfig[] = [];
    tablesToSync.forEach((t, idx) => {
      if (dirtyTables.includes(t.Name)) {
        orderedTables.push(t);
      } else {
        nonDirtyTables.push(t);
      }
    });
    return orderedTables.concat(nonDirtyTables);
  }

  private maybeAddSystemTables(
    tablesToSyncConfig: SyncTableConfig[]
  ): SyncTableConfig[] {
    const fileLibAlready  = tablesToSyncConfig.some(table => {return table["Name"] == 'File_Library__ap'});
    if (fileLibAlready) {
      return tablesToSyncConfig;
    } else {
      const initialSyncTables = AppConfig.initialSyncTables;
      if (initialSyncTables && initialSyncTables.includes('File_Library__ap')) {
        const fileLibrarySyncConfig = {
          Name: 'File_Library__ap',
          syncWithoutLocalUpdates: true,
          maxTableAge: 0
        };
        return tablesToSyncConfig.concat([fileLibrarySyncConfig]);
      } else {
        return tablesToSyncConfig;
      }
    }
  }
}
