import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { catchError, firstValueFrom, map, of, switchMap } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { LANG_STORAGE_KEY, SUPPORTED_LANGS, DEFAULT_LANG } from './core/i18n/lang.constants';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { environment } from '../environments/environment';

function initialLang(): string {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return stored && SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
}

/**
 * Runs before the app renders: trades the httpOnly refresh cookie (if any)
 * for a fresh access token and hydrates the current user, so a hard reload
 * on a protected page doesn't look like a logout. A 401 here just means
 * there's no valid session — not an app startup failure.
 */
function restoreSession(): Promise<void> {
  const authService = inject(AuthService);
  return firstValueFrom(
    authService.refreshToken().pipe(
      switchMap(() => authService.loadCurrentUser()),
      map(() => undefined),
      catchError(() => of(undefined)),
    ),
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAppInitializer(restoreSession),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
    provideTransloco({
      config: {
        availableLangs: SUPPORTED_LANGS,
        defaultLang: initialLang(),
        fallbackLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
