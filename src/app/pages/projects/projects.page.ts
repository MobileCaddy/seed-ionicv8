import { Component, OnDestroy, OnInit } from '@angular/core';
import { Project, ProjectsService } from '../../services/projects.service';
import { Subscription } from 'rxjs';

const LOG_TAG = 'projects.page'

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
})
export class ProjectsPage implements OnDestroy, OnInit {

  protected isSyncing: boolean = false;
  protected projects!: Project[];
  private projectSubscription!: Subscription;

  constructor(
    private projectsSrvc: ProjectsService) { }

  async ngOnInit() {
    console.log(LOG_TAG, "ngOnInit");
    this.projects = await this.getProjects();

    // Setup a subscription to see if a project updates  
    this.projectSubscription = this.projectsSrvc.project.subscribe(res => {
      console.log(LOG_TAG, 'projectSubscription', res);
      if ((res as Project).Id) {
        this.projects?.forEach((p, idx) => {
          if (p.Id == (res as Project).Id) {
            this.projects[idx] = (res as Project);
          }
        })
      }
    });
  }
  
  ngOnDestroy(): void {
    this.projectSubscription?.unsubscribe();
  }


  /*==========================================================================
   * P R O T E C T E D
   *========================================================================*/

  protected sync() :void {
    console.log(LOG_TAG, 'sync');
    this.isSyncing = true;
    this.projectsSrvc.sync().then( async _ => {
      this.isSyncing = false;
      this.projects = await this.getProjects();
    }).catch(_ => {
      this.isSyncing = false;
    })
  }

  /*==========================================================================
   * P R I V A T E
   *========================================================================*/


  // Pretty dumb, just for show. Here so we have a test for it more than anything.
  private getProjects(): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      const c = await this.projectsSrvc.getProjects();
      resolve(c);
    });
  }
}
