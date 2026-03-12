import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { SystemSettingsService } from './core/services/system-settings.service';

describe('App', () => {
  const bootstrapSession = vi.fn(() => of(null));
  const loadPublic = vi.fn(() => of(null));

  beforeEach(async () => {
    bootstrapSession.mockClear();
    loadPublic.mockClear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: {
            bootstrapSession
          }
        },
        {
          provide: SystemSettingsService,
          useValue: {
            loadPublic
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should bootstrap public settings and session on init', () => {
    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.ngOnInit();

    expect(loadPublic).toHaveBeenCalledTimes(1);
    expect(bootstrapSession).toHaveBeenCalledTimes(1);
  });
});
