import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { analInc } from 'mobilecaddy-utils/devUtils';
import * as logger from 'mobilecaddy-utils/logger';
import { locationKeyMap, Project, ProjectsService } from '../../services/projects.service';
import { Subscription } from 'rxjs';
import { NgForm } from '@angular/forms';

const LOG_TAG = 'project.page';

@Component({
  selector: 'app-project',
  templateUrl: './project.page.html',
  styleUrls: ['./project.page.scss'],
})
export class ProjectPage implements OnDestroy, OnInit {
  @ViewChild('projectForm') public projectForm!: NgForm;
  
  private activatedRoute = inject(ActivatedRoute);
  private projectSubscription!: Subscription;
  private initialProject!: Project;

  protected clean:boolean = true;
  protected isAlertOpen: boolean = false;
  protected project!: Project | null;
  protected locationKeyMap!: locationKeyMap;
  protected locationReverseKeyMap: any = {};

  public alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.isAlertOpen = false;
        (this.project as Project).mobilecaddy1__Status__c = ((this.project as Project).mobilecaddy1__Status__c === "Closed")?
          'Open':
          'Closed';
        console.log('Alert canceled');
      },
    },
    {
      text: 'OK',
      role: 'confirm',
      handler: () => {
        this.isAlertOpen = false;
        console.log('Alert confirmed');
        this.saveEdit();
      },
    },
  ];

  constructor(
    private projServ: ProjectsService
  ) { }

  ngOnInit() {
    this.project = null;
    const projectId = this.activatedRoute.snapshot.paramMap.get('projectId') as string;
    console.log(LOG_TAG, "ngOnInit");
    this.projServ.getLocationKeyMap().then( r => {
      this.locationKeyMap = r;
      this.locationReverseKeyMap = {};
      for (const l in this.locationKeyMap) {
        this.locationReverseKeyMap[this.locationKeyMap[l]] = l;
      }
    });
    this.projectSubscription = this.projServ.project.subscribe(res => {
      console.log('projectSubscription', res);
      this.project = {... res as Project};

      // Not sure why we need to do this, but the ion-select appears to have issue if we come back to
      // a page with the same value. Not sure if this is ngform or ionic
      const location = this.project.mobilecaddy1__MC_Project_Location__c;
      this.project.mobilecaddy1__MC_Project_Location__c  = "";
      setTimeout(() => {
        if (this.project) {
          console.log("setting mobilecaddy1__MC_Project_Location__c", location);
          this.project.mobilecaddy1__MC_Project_Location__c = location;
        }
      }, 100);

      this.initialProject = {... this.project}
    });
  }

  ngOnDestroy(): void {
    this.projectSubscription?.unsubscribe();
  }


  async ionViewWillEnter() {
    analInc('userView');
    const projectId = this.activatedRoute.snapshot.paramMap.get('projectId') as string;
    console.log("ionViewWillEnter", projectId, this.project);
    this.projServ.getProject(projectId);
  }



  /*==========================================================================
   * P R O T E C T E D
   *========================================================================*/

  protected cancelEdit(): void {
    this.projectForm.resetForm();
    this.project = {... this.initialProject};
  }


  protected closeProject() {
    (this.project as Project).mobilecaddy1__Status__c = "Closed";
    this.isAlertOpen = true;
  }

  protected handleConfirm() {
    console.log("handleConfirm()");
  }

  protected async saveEdit(): Promise<void> {
    if (this.project) {
      this.project.location = this.project.mobilecaddy1__MC_Project_Location__c ?
        this.locationKeyMap[this.project.mobilecaddy1__MC_Project_Location__c] as string :
        '';
      await this.projServ.updateProject(this.project);
      this.initialProject = {... this.project};
      this.projectForm.resetForm()
      setTimeout(() => this.project = {... this.initialProject}, 50);
    }
  }
    
    protected reOpenProject() {
      (this.project as Project).mobilecaddy1__Status__c = "Open";
      this.isAlertOpen = true;
    }

}
