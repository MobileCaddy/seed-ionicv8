import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonLoading } from '@ionic/angular';
import { register } from 'swiper/element/bundle';

import { AppConfig } from '../../../config/app-config';
import { StartupService } from '../../services/startup.service';
import { Subscription } from 'rxjs';
import { SyncService } from '../../services/sync.service';

const LOG_TAG = 'loading.page';

declare let window: any;

register();

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
})
export class LoadingPage implements OnDestroy, OnInit {
  @ViewChild('loading') loader?: IonLoading;
  @ViewChild('swiper') swiperRef: ElementRef | undefined;

  // This is a holding image that can be shown if the user has clicked through all the
  // welcome slides but the app is not fully ready.
  protected loadingImage?: string = '../assets/img/loading-splash.jpg';
  protected loadingMessage?: string;
  protected showWelcome:boolean = false;
  protected welcomeSlides: Array<{imagePath: string}> = [];
  
  private getInitialSyncStateSubscription?: Subscription;
  private getInitStateSubscription?: Subscription;
  private initialSyncComplete: boolean = false;

  constructor(
    private router: Router,
    private startupService: StartupService,
    private syncService: SyncService
  ) { }

  ngOnInit() {
    console.log(LOG_TAG, 'ngOnInit');
    this.monitorInitSyncState();
    this.monitorInitStateSubscription();
  }

  ngOnDestroy() {
    console.log(LOG_TAG, 'ngOnDestroy');
    if (this.getInitialSyncStateSubscription) {
      this.getInitialSyncStateSubscription.unsubscribe();
    }
    if (this.getInitStateSubscription) {
      this.getInitStateSubscription.unsubscribe();
    }
  }


  /*==========================================================================
   * P R I V A T E
   *========================================================================*/

  private monitorInitSyncState(): void {
    this.getInitialSyncStateSubscription = this.syncService
    .getInitialSyncState()
    .subscribe(initialSyncState => {
      // If the initialSync is NOT completed then display message
      if (initialSyncState !== 'InitialLoadComplete') {
        this.populateWelcomeSlides();
        this.showWelcome = true;
        this.loadingMessage = 'Preparing App';
      } else {
        this.initialSyncComplete = true;
        // this.loadingMessage = 'Retrieving media';
      }
    });
  }


  private monitorInitStateSubscription(): void {
    let numOfTables: number = AppConfig.initialSyncTables?.length ?? 0;
    let currentSyncTableNumber: number = 1;

    this.getInitStateSubscription = this.startupService
    .getInitState()
    .subscribe(res => {
      console.log(LOG_TAG, 'getInitState', res);
      if (!this.showWelcome && !this.loader?.isOpen) {
        this.loader?.present();
      }
      switch (res) {
        case undefined:
        case 'undefined':
          break;
        case 'InitialSyncInProgress':
          if ( this.showWelcome ) {
            console.log('showWelcome');
            console.log('Hide mcsdk splachscreen');
            if (window.plugin) window.plugin.mcsdk.hideSplashScreen();
            // do nothing
          } else {
            // TODO
            // this.setLoadingBlurImage();
          }
          break;
        case 'complete':
          if (this.loader) {
            this.loader.dismiss();
          }
          if (!this.showWelcome) {
            this.router.navigateByUrl('/home', { replaceUrl:true });
          }
          // TODO
          // if (this.upgradeInProgress) {
            // this.upgradeInProgress = false;
            // localStorage.removeItem('appConfigUpdateInProgress');
            // if (this.alertUpgradeInProgress) {
            //   this.alertUpgradeInProgress.dismiss();
            //   this.alertUpgradeInProgress = null;
            // }
            // this.showUpdateCompleteAlert();
          // }
          break;
        default:
          // Build messages check
          if (res.status === -1) {
            if (res.info === 'Preparing platform' || res.info === 'Preparing database') {
              // Show splashscreen - The utils may have hidden it (for non CDFY apps)
              // console.log('show splashscreen');
              if (window.plugin) window.plugin.mcsdk.showSplashScreen();
            }
            this.loadingMessage = res.info;
          }
          // Syncing messages check
          if (res.status === 0) {
            const syncPercent = (!isNaN(currentSyncTableNumber)) ?
              Math.ceil((((currentSyncTableNumber - 1) / numOfTables) * 100) + 5) + '%' :
              '';
            this.loadingMessage = 'Retrieving Content ' + syncPercent;
            currentSyncTableNumber ++;
          }
        }
    });
  }

  populateWelcomeSlides(){
    const resourcePath = (window.RESOURCE_ROOT === '') ?
      '' :
      window.RESOURCE_ROOT + '/';
    this.welcomeSlides = [
      {imagePath: resourcePath + 'assets/img/ws-01.png'},
      {imagePath: resourcePath + 'assets/img/ws-02.png'}
    ];
  }

  welcomeSlideClick(idx: Number) {
    console.log(LOG_TAG, 'welcomeSlideClick', idx);
    if (idx === this.welcomeSlides.length - 1) {
      this.showWelcome = false;
      if ( this.initialSyncComplete ) {
        this.router.navigateByUrl('/home', { replaceUrl:true });
      } else {
        this.loadingMessage = '';
        // TODO
        // this.setLoadingBlurImage();
      }
    } else {
      this.swiperRef?.nativeElement.swiper.slideNext();
    }
  }
}
