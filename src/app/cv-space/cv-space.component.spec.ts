import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CvSpaceComponent } from './cv-space.component';

describe('CvSpaceComponent', () => {
  let component: CvSpaceComponent;
  let fixture: ComponentFixture<CvSpaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CvSpaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CvSpaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
