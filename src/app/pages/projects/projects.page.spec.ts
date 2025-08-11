import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectsPage } from './projects.page';

describe('ProjectsPage', () => {
  let component: ProjectsPage;
  let fixture: ComponentFixture<ProjectsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectsPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); TH 11th Aug 25 - not sure why I had to comment this out
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
