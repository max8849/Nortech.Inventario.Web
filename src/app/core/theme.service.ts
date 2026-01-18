import { Injectable } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'nortech_theme';

  init(): void {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const mode: ThemeMode = saved ?? (prefersDark ? 'dark' : 'light');
    this.apply(mode);
  }

  get current(): ThemeMode {
    return document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  }

  toggle(): void {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  }

  apply(mode: ThemeMode): void {
    if (mode === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');

    localStorage.setItem(this.storageKey, mode);
  }
}
