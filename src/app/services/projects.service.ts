import { Injectable } from '@angular/core';

import { readRecords, smartSql, updateRecord, syncMobileTable } from 'mobilecaddy-utils/devUtils';
import * as logger from 'mobilecaddy-utils/logger';
import { BehaviorSubject } from 'rxjs';

export interface Project {
  Id: string;
  Name: string;
  mobilecaddy1__Description__c?: string;
  mobilecaddy1__Status__c?: null | 'Open' | 'Closed';
  mobilecaddy1__MC_Project_Location__c?: string;
  location?: string;
}

export interface locationKeyMap {
  [propName: string]: 'Office' | 'Client Site';
}

const LOG_TAG = 'projects.service';


const LOCATION_TABLE = 'MC_Project_Location__ap';
const PROJECT_TABLE = 'MC_Project__ap';
@Injectable({
  providedIn: 'root'
})
export class ProjectsService {

  public project: BehaviorSubject<Project | {}> = new BehaviorSubject({});

  private curProject!: Project;

  constructor() { }


  public getLocationKeyMap(): Promise<locationKeyMap> {
    return new Promise(async (resolve, reject) => {
      resolve(await this.createLocationKeyMap());
    });
  }

  /**
   * Gets a project and it's related location.
   * This is just an exmpple of how we might have an Observable sending back staged answers as our result gets more enriched.
   * In this scenario we return the project and then update it with the Location once we have also read that.
   * @param id The Salesforce Id of the project
   */
  public getProject(id: string): void {
    const soql = "SELECT * FROM {" + PROJECT_TABLE + "} WHERE {" + PROJECT_TABLE + ":Id} = '" + id + "'";
    console.log('getProject', soql);
    smartSql(soql).then( async res => {
      if (res.records) {
        this.curProject = res.records[0] as Project;
        if (this.curProject.mobilecaddy1__MC_Project_Location__c) {
           this.curProject.location = await this.getLocationName();
        }
        this.project.next(this.curProject);
      } else {
        logger.warn('No project returned', id);
      }
    }).catch(e => {
      logger.error(LOG_TAG, e);
    });
  }
  
  public async getProjects(): Promise<Project[]> {
    const locationKeyMap = await this.createLocationKeyMap();
    return new Promise((resolve, reject) => {
      readRecords(PROJECT_TABLE).then( res => {
        const enrichedRecs = res.records.map(p => {
          if (p.mobilecaddy1__MC_Project_Location__c) {
            p.location = locationKeyMap[p.mobilecaddy1__MC_Project_Location__c];
          }
          return p;
        });
        resolve( enrichedRecs );
      }).catch(e => {
        logger.error(LOG_TAG, e);
        reject(e);
      });
    });
  }

  public sync(): Promise<void> {
    return new Promise((resolve, reject) => {
      syncMobileTable(PROJECT_TABLE).then( (r: any) => {
        resolve();
      }).catch( (e: any) => {
        logger.error(LOG_TAG, 'sync', e);
      });
    });
  }

  public updateProject(p: Project): Promise<void> {
    console.log("updateProject", p);
    return new Promise((resolve, reject) => {
      const updatedProject:Project = {
        Id: p.Id,
        Name: p.Name,
        mobilecaddy1__Description__c: p.mobilecaddy1__Description__c,
        mobilecaddy1__MC_Project_Location__c: p.mobilecaddy1__MC_Project_Location__c,
        mobilecaddy1__Status__c: p.mobilecaddy1__Status__c
      }
      updateRecord(PROJECT_TABLE, updatedProject, "Id").then((r:any) => {
        console.log("updateRecord", r);
        this.project.next(p);
        resolve();
      }).catch((e: any) => {
        logger.error("updateProject", e);
        reject(e);
      });
    });
  }

  /*==========================================================================
   * P R I V A T E
   *========================================================================*/

  private async createLocationKeyMap(): Promise<locationKeyMap> {
    return new Promise((resolve, reject) => {
      console.log('createLocationKeyMap', this.curProject);
      const soql = "SELECT * FROM {" + LOCATION_TABLE + "}";
      smartSql(soql).then( res => {
        if (res.records) {
          let mymap:locationKeyMap = {};
          for (let location of res.records) {
            mymap[location.Id] = location.Name
          }
          resolve(mymap);
        }
      }).catch(e => {
        logger.error(LOG_TAG, e);
      });
    });
  }

  private getLocationName(): Promise<string> {
    return new Promise((resolve, reject) => {
      const soql = "SELECT * FROM {" + LOCATION_TABLE + "} WHERE {" + LOCATION_TABLE + ":Id} = '" + this.curProject?.mobilecaddy1__MC_Project_Location__c + "'";
      smartSql(soql).then( res => {
        if (this.curProject && res.records) {
          resolve(res.records[0].Name)
        } else {
          logger.warn('No location returned', this.curProject);
        }
      }).catch(e => {
        logger.error(LOG_TAG, e);
      });
    });
  }
}
