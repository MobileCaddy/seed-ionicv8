import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectPage } from './project.page';

describe('ProjectPage', () => {
  let component: ProjectPage;
  let fixture: ComponentFixture<ProjectPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); TH 11th Aug 25 - not sure why I had to comment this out
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
