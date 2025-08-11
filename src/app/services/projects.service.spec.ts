import { TestBed } from '@angular/core/testing';
import * as devUtils from 'mobilecaddy-utils/devUtils';
import { ProjectsService } from './projects.service';

const SMART_SQL_MOCK_RECORDS = [{"Name":"Client Site", "Id": '001'}];
const TEST_PROJECT ={"Id": '001', 'mobilecaddy1__MC_Project_Location__c': '001','Name': "project1"};

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return projects array ', async () => {
    // Spies
    spyOn(devUtils, 'smartSql').and.resolveTo({records: SMART_SQL_MOCK_RECORDS , status : 1, upgradeAvailable: false, mc_add_status: null});
    spyOn(devUtils, 'readRecords').and.resolveTo({records: [TEST_PROJECT], status : 1, upgradeAvailable: false, mc_add_status: null});
    
    const projects = await service.getProjects();
    expect(projects.length).toEqual(1);
    expect(projects[0].location).toEqual('Client Site');  
  });
  
});