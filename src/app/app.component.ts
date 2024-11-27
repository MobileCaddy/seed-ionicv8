import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { StartupService, runState } from './services/startup.service';
import { Subscription } from 'rxjs';
import { SyncService } from './services/sync.service';
import { AppConfig } from '../config/app-config';

// This import isn't really needed - but it allows us to easily access the devUtils from
// the Javascript Debug console. Can be removed.
import * as devUtils from 'mobilecaddy-utils/devUtils';

const LOG_TAG = 'app.component.ts';

declare let window: any;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})

export class AppComponent implements OnDestroy {

  private getInitStateSubscription?: Subscription;
  private syncSubscription?: Subscription;

  public appPages = AppConfig.menuItems;
  
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];

  // Again, this is only here to allow us to easily access the devUtils from
  // the Javascript Debug console. Can be removed.
  public devUtils = devUtils;

  constructor(
    private platform: Platform,
    private router: Router,
    private startupService: StartupService,
    private syncService: SyncService,
  ) {
    if ( window.LOCAL_DEV ) {
      // Running in CodeFlow - so no platform.ready()
      this.initializeApp();
    } else {
      this.platform.ready().then(() => {
        this.initializeApp();
      });
    }
  }

  ngOnDestroy() {
    if (this.getInitStateSubscription) {
      this.getInitStateSubscription.unsubscribe();
    }
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }


  /*==========================================================================
   * P R I V A T E
   *========================================================================*/


  private handleColdStart():void {
    console.log(LOG_TAG ,'hide splashscreen');
    if (window.plugin) {
      setTimeout(() => {        
        window.plugin.mcsdk.hideSplashScreen();
        setTimeout(() => {        
          console.log(LOG_TAG, 'hide splashscreen retry');
          window.plugin.mcsdk.hideSplashScreen();
        }, 2000);
      }, 500);
    }
    this.navigateToStartPage();
  }


  private initializeApp(): void {
    const runningState = this.startupService.startup({});
    console.log(LOG_TAG, runningState);
    if ( runningState == runState.ColdStart ) {
      this.handleColdStart();
    } else {
      this.monitorSyncSubscription();
      this.monitorInitStateSubscription();
    }
  }

  
  /** 
   * @desc Monitor the sync subscription
   *  This might tell us if we have updated appconfig, which we might want
   *  to act upon
   */
  private monitorSyncSubscription(): void {
    this.syncSubscription = this.syncService.getSyncState().subscribe(res => {
      console.log("Got syncSubscription msg", res);
      if (res === 'new-appconfig-received') {
        // Perhaps rebuild our menu items?
      }
    });
  }

  
  private monitorInitStateSubscription(): void {
    this.getInitStateSubscription = this.startupService
    .getInitState()
    .subscribe(res => {
      let pagesSet: Boolean = false;
      if (res) {
        // Syncing messages check
        if (res.status === 0 && !pagesSet) {
        }
        if (res === 'complete') {
          console.log("received 'complete' from getInitState ");
          pagesSet = true;
          // this.navigateToStartPage();
          this.getInitStateSubscription?.unsubscribe();
        }
      }
    });
  }

  
  private navigateToStartPage(): void {
    // TODO - Config updates for Menu etc

    this.router.navigateByUrl('/home', { replaceUrl:true });
  }
}
