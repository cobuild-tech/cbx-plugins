import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
registerLocaleData(localeDe);
// Locale and language follow the user's profile; users can switch language at runtime (TranslateService.use).
export const providers = [{ provide: LOCALE_ID, useValue: 'de-DE' }];
