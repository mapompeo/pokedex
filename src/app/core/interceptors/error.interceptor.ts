import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error) => {
      const isTranslationRequest = req.url.includes('mymemory.translated.net');
      if (!isTranslationRequest) {
        snackBar.open('Não foi possível carregar os dados. Tente novamente.', 'Fechar', {
          duration: 4000,
          panelClass: 'app-snackbar',
        });
      }
      return throwError(() => error);
    })
  );
};
