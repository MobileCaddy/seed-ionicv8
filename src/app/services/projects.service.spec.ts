import { TestBed } from '@angular/core/testing';
import * as devUtils from 'mobilecaddy-utils/devUtils';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return projects array ', () => {
    spyOn(devUtils, 'readRecords').and.resolveTo({records: [], status : 1, upgradeAvailable: false, mc_add_status: null});
    service.getProjects().then( c => {
      expect(c).toEqual([]);
    });    
  });
  
});